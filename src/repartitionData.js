import DuckDB from 'duckdb';
import { metricScope, Unit } from 'aws-embedded-metrics';
import Logger from './utils/logger';

// Instantiate logger
const logger = new Logger();

// Instantiate DuckDB
const duckDB = new DuckDB.Database(':memory:');

// Create connection
const connection = duckDB.connect();

// Store initialization
let isInitialized = false;

// Store AWS region
let region; 

// Promisify query method
const query = (query) => {
  return new Promise((resolve, reject) => {
    connection.all(query, (err, res) => {
      if (err) reject(err);
      resolve(res);
    })
  })
}

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_SESSION_TOKEN,
  AWS_REGION,
  DUCKDB_MEMORY_LIMIT,
  DUCKDB_THREADS,
  CUSTOM_AWS_REGION,
  REPARTITION_QUERY,
} = process.env;

// eslint-disable-next-line import/prefer-default-export
export const handler = metricScope(metrics => async (event, context) => {
  // Setup logger
  const requestLogger = logger.child({ requestId: context.awsRequestId });
  requestLogger.debug({ event, context });

  // Setup metrics
  metrics.putDimensions({ Service: 'QueryService' });
  metrics.setProperty('RequestId', context.awsRequestId);

  // Assign AWS region for query
  if (CUSTOM_AWS_REGION) {
    region = CUSTOM_AWS_REGION;
  } else {
    region = AWS_REGION;
  }

  try {
    // Check if DuckDB has been initalized
    if (!isInitialized) {
      const initialSetupStartTimestamp = new Date().getTime();
      
      // Set home directory
      await query(`SET home_directory='/tmp';`);
      // Load httpsfs
      await query(`INSTALL httpfs;`);
      await query(`LOAD httpfs;`);
      // New speedup option, see https://github.com/duckdb/duckdb/pull/5405
      await query(`SET enable_http_metadata_cache=true;`);
      // Set memory limit
      await query(`SET memory_limit='${parseInt((DUCKDB_MEMORY_LIMIT/1024).toFixed(0))}GB';`);
      // Set thread count
      if (DUCKDB_THREADS && DUCKDB_THREADS >= 1 && DUCKDB_THREADS <= 6) {
        await query(`SET threads TO ${DUCKDB_THREADS};`);
      }

      requestLogger.debug({ message: 'Initial setup done!' });
      metrics.putMetric('InitialSetupDuration', (new Date().getTime() - initialSetupStartTimestamp), Unit.Milliseconds);

      const awsSetupStartTimestamp = new Date().getTime();
      
      // Set AWS credentials
      // See https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime
      await query(`SET s3_region='${region}';`);
      await query(`SET s3_access_key_id='${AWS_ACCESS_KEY_ID}';`);
      await query(`SET s3_secret_access_key='${AWS_SECRET_ACCESS_KEY}';`);
      await query(`SET s3_session_token='${AWS_SESSION_TOKEN}';`);

      requestLogger.debug({ message: 'AWS setup done!' });
      metrics.putMetric('AWSSetupDuration', (new Date().getTime() - awsSetupStartTimestamp), Unit.Milliseconds);

      // Store initialization
      isInitialized = true;
    }

    // Track query start timestamp
    const queryStartTimestamp = new Date().getTime();

    // Run query
    const queryResult = await query(REPARTITION_QUERY);
    requestLogger.debug({ queryResult });

    metrics.putMetric('QueryDuration', (new Date().getTime() - queryStartTimestamp), Unit.Milliseconds);

    return;
  } catch (err) {
    requestLogger.error(err);
    return err;
  }
})

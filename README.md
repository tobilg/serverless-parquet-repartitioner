# serverless-parquet-repartitioner
A AWS Lambda function for repartitioning parquet files in S3 via DuckDB queries.

## Requirements
You'll need a current v3 version installation of the [Serverless Framework](https://serverless.com) on the machine you're planning to deploy the application from.

Also, you'll have to setup your AWS credentials according to the [Serverless docs](https://www.serverless.com/framework/docs/providers/aws/guide/credentials/).

### Install dependencies
After cloning the repo, you'll need to install the dependencies via

```bash
$ npm i
```

## Configuration
You can customize the configuration of the stack by setting some configuration values. Open up the [serverless.yml](serverless.yml) file, and search for `TODO` in your IDE. This will point you to the places you need to update according to your needs.

### Mandatory configuration settings

* [S3 bucket name](serverless.yml#L18): You need to use the S3 bucket where your data that you want to repartition resides (e.g. `my-source-bucket`)
* [Custom repartitioning query](serverless.yml#L77): You can write flexible repartitioning queries in the DuckDB syntax. Have a look at the examples at the [httpfs extension docs](https://duckdb.org/docs/extensions/httpfs). You **need** to update this, as the template uses only example values!

### Optional configuration settings

* [S3 region](serverless.yml#L79): The AWS region your S3 bucket is deployed to (if different from the region the Lambda funciton is deployed to)
* [The schedule](serverless.yml#L84): The actual schedule on why the Lambda function is run. Have a look at the [Serverless Framework docs](https://www.serverless.com/framework/docs/providers/aws/events/schedule) to find out what the potential settings are.
* [DuckDB memory limit](serverless.yml#L48): The memory limit is influenced by the function memory setting (automatically)
* [DuckDB threads count](serverless.yml#L75): Optionally set the max thread limit (on Lambda, this is set automatically by the amount of memory the functions has assigned), but with this setting you can influence how many files are writte per partition. If you set a lower thread count than available, this means that the computation will not use all available resources for the sake of being able to set the number of generated files! Ideally, rather align the amount of memory you assign to the Lambda function.
* [Lambda timeout](serverless.yml#L50): The maximum time a Lambda function can run is currently 15min / 900sec. This means that if your query takes longer than that, it will be terminated by the underlying Firecracker engine.

### Using different source/target S3 buckets
If you're planning to use different S3 buckets as source and target for the data repartitioning, you need to adapt the `iamRoleStatements` settings of the function.

Here's an example with minimal privileges:

```yaml
iamRoleStatements:
  # Source S3 bucket permissions
  - Effect: Allow
    Action:
      - s3:ListBucket
    Resource: 'arn:aws:s3:::my-source-bucket'
  - Effect: Allow
    Action:
      - s3:GetObject
    Resource: 'arn:aws:s3:::my-source-bucket/*'
  # Target S3 bucket permissions
  - Effect: Allow
    Action:
      - s3:ListBucket
      - s3:ListBucketMultipartUploads
    Resource: 'arn:aws:s3:::my-target-bucket'
  - Effect: Allow
    Action:
      - s3:PutObject
      - s3:AbortMultipartUpload
      - s3:ListMultipartUploadParts
    Resource: 'arn:aws:s3:::my-target-bucket/*'
```

A query for this use case would look like this:

```sql
COPY (SELECT * FROM parquet_scan('s3://my-source-bucket/input/*.parquet', HIVE_PARTITIONING = 1)) TO 's3://my-starget-bucket/output' (FORMAT PARQUET, PARTITION_BY (column1, column2, column3), ALLOW_OVERWRITE TRUE);
```

## Deployment
After you cloned this repository to your local machine and cd'ed in its directory, the application can be deployed like this (don't forget a `npm i` to install the dependencies!):

```bash
$ sls deploy
```

This will deploy the stack to the default AWS region `us-east-1`. In case you want to deploy the stack to a different region, you can specify a `--region` argument:

```bash
$ sls deploy --region eu-central-1
```

The deployment should take 2-3 minutes.

## Checks and manual triggering
You can [manually invoke](https://www.serverless.com/framework/docs/providers/aws/cli-reference/invoke) the deployed Lambda function by running

```bash
$ sls invoke -f repartitionData
```

After that, you can [check the generated CloudWatch logs](https://www.serverless.com/framework/docs/providers/aws/cli-reference/logs) by issueing

```bash
$ sls logs -f repartitionData
```

If you don't see any `DUCKDB_NODEJS_ERROR` in the logs, everything ran successfully, and you can have a look at your S3 bucket for the newly generated parquet files.

## Costs
Using this repository will generate costs in your AWS account. Please refer to the AWS pricing docs before deploying and running it.

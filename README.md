# serverless-parquet-repartitioner
A AWS Lambda function for repartitioning parquet files in S3 via DuckDB queries.

## Requirements
You'll need a current v3 version installation of the [Serverless Framework](https://serverless.com) on the machine you're planning to deploy the application from.

Also, you'll have to setup your AWS credentials according to the [Serverless docs](https://www.serverless.com/framework/docs/providers/aws/guide/credentials/).

## Configuration
You can customize the configuration of the stack by setting some configuration values. Open up the [serverless.yml](serverless.yml) file, and search for `TODO` in your IDE. This will point you to the places you need to update according to your needs.

### Mandatory configuration settings

* [S3 bucket name](serverless.yml#L18): You need to use the S3 bucket where your data that you want to repartition resides (e.g. `my-source-bucket`)
* [Actual repartitioning query](serverless.yml#L70): You can write flexible repartitioning queries in the DuckDB syntax. Have a look at the examples at the [httpfs extension docs](https://duckdb.org/docs/extensions/httpfs). You **need** to update this, as the template uses only example values!

### Optional configuration settings

* [S3 region](serverless.yml#L72): The AWS region your S3 bucket is deployed to (if different from the region the Lambda funciton is deployed to)
* [The schedule](serverless.yml#L77): The actual schedule on why the Lambda function is run. Have a look at the [Serverless Framework docs](https://www.serverless.com/framework/docs/providers/aws/events/schedule) to find out what the potential settings are.

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

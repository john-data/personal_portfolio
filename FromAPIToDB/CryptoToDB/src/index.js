/* Amplify Params - DO NOT EDIT
	API_DATABOXQL_APIDATACOVIDTABLE_ARN
	API_DATABOXQL_APIDATACOVIDTABLE_NAME
	API_DATABOXQL_CRYPTOHEALTHTABLE_ARN
	API_DATABOXQL_CRYPTOHEALTHTABLE_NAME
	API_DATABOXQL_CRYPTOPRICESTABLE_ARN
	API_DATABOXQL_CRYPTOPRICESTABLE_NAME
	API_DATABOXQL_GRAPHQLAPIENDPOINTOUTPUT
	API_DATABOXQL_GRAPHQLAPIIDOUTPUT
	API_DATABOXQL_GRAPHQLAPIKEYOUTPUT
	API_DATABOXQL_USERTABLE_ARN
	API_DATABOXQL_USERTABLE_NAME
	AUTH_DATAESCARGO29577CF0_USERPOOLID
	ENV
	REGION
	STORAGE_APIDATACOVID_ARN
	STORAGE_APIDATACOVID_NAME
	STORAGE_APIDATACOVID_STREAMARN
	STORAGE_DATABOXS3_BUCKETNAME
Amplify Params - DO NOT EDIT */
const AWS = require("aws-sdk");
const { randomUUID } = require("crypto");
const axios = require("axios").default;
const gql = require("graphql-tag");
const graphql = require("graphql");
const { print } = graphql;
const s3 = new AWS.S3();
const docClient = new AWS.DynamoDB.DocumentClient();

const createCryptoPrices = gql`
  mutation createCryptoPrices($input: CreateCryptoPricesInput!) {
    createCryptoPrices(input: $input) {
      id
      createdAt
      frmCurrCode
      frmCurrName
      toCurrCode
      toCurrName
      xcRate
      lastUpdate
      TZ
      BidPrice
      AskPrice
    }
  }
`;

exports.handler = async (event, context) => {
  //generate random ID for both health and price to match

  console.log("Received event:", JSON.stringify(event, null, 2));

  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );
  const params = {
    Bucket: bucket,
    Key: key,
  };
  try {
    console.log("retrieving file from s3");
    const data = await s3.getObject(params).promise();
    console.log("decode json file...");
    let manipulate = data.Body.toString("utf-8");
    let stripBrackets = manipulate.replace(/[[\]']+/g, "");
    const parseJSON = JSON.parse(stripBrackets);
    console.log("Strip [] from JSON = " + stripBrackets);

    const parent1 = "Realtime Currency Exchange Rate";
    console.log(
      "Get properties of the JSON = ",
      parseJSON[parent1]["1. From_Currency Code"],
      parseJSON[parent1]["2. From_Currency Name"],
      parseJSON[parent1]["3. To_Currency Code"],
      parseJSON[parent1]["4. To_Currency Name"],
      parseJSON[parent1]["5. Exchange Rate"],
      parseJSON[parent1]["6. Last Refreshed"],
      parseJSON[parent1]["7. Time Zone"],
      parseJSON[parent1]["8. Bid Price"],
      parseJSON[parent1]["9. Ask Price"]
    );

    const dbparams = {
      TableName: "CryptoPrices-qbvr44scbnevvkbajtsewd4fsa-datadev",
      Item: {
        id: randomUUID(),
        frmCurrCode: parseJSON[parent1]["1. From_Currency Code"],
        frmCurrName: parseJSON[parent1]["2. From_Currency Name"],
        toCurrCode: parseJSON[parent1]["3. To_Currency Code"],
        toCurrName: parseJSON[parent1]["4. To_Currency Name"],
        xcRate: parseJSON[parent1]["5. Exchange Rate"],
        lastUpdate: parseJSON[parent1]["6. Last Refreshed"],
        TZ: parseJSON[parent1]["7. Time Zone"],
        BidPrice: parseJSON[parent1]["8. Bid Price"],
        AskPrice: parseJSON[parent1]["9. Ask Price"],
      },
    };

    async function createItem() {
      try {
        await docClient.put(dbparams).promise();
      } catch (err) {
        return err;
      }
    }

    try {
      console.log("writing to gql/dynamo");

      await createItem();
      const body = {
        message: "successfully created record for covid!",
      };
      return {
        statusCode: 200,
        body: JSON.stringify(body),
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      };
    } catch (err) {
      console.log("error creating record using gql: ", err);
    }
    return data;
  } catch (err) {
    console.log(err);
    const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
    console.log(message);
    throw new Error(message);
  }
};

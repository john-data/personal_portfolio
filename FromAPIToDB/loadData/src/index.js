/* Amplify Params - DO NOT EDIT
	API_DATABOXQL_APIDATACOVIDTABLE_ARN
	API_DATABOXQL_APIDATACOVIDTABLE_NAME
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
const s3 = new AWS.S3();
const axios = require("axios").default;
const gql = require("graphql-tag");
const graphql = require("graphql");
const { print } = graphql;

const createAPIDataCovid = gql`
  mutation createAPIDataCovid($input: CreateAPIDataCovidInput!) {
    createAPIDataCovid(input: $input) {
      id
      confirmedCases
      recoveredCases
      criticalCases
      deaths
      lastChange
      lastUpdate
      covidState
    }
  }
`;

exports.handler = async (event, context) => {
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
    console.log(
      "Get properties of the JSON = ",
      parseJSON["confirmed"],
      parseJSON["recovered"],
      parseJSON["critical"],
      parseJSON["deaths"],
      parseJSON["lastChange"],
      parseJSON["lastUpdate"]
    );

    try {
      console.log("writing to gql/dynamo");
      const graphqlData = await axios({
        url: process.env.API_DATABOXQL_GRAPHQLAPIENDPOINTOUTPUT,
        method: "post",
        headers: {
          "x-api-key": process.env.API_DATABOXQL_GRAPHQLAPIKEYOUTPUT,
        },
        data: {
          query: print(createAPIDataCovid),
          variables: {
            input: {
              id: randomUUID(),
              confirmedCases: parseJSON["confirmed"],
              recoveredCases: parseJSON["recovered"],
              criticalCases: parseJSON["critical"],
              deaths: parseJSON["deaths"],
              lastChange: parseJSON["lastChange"],
              lastUpdate: parseJSON["lastUpdate"],
            },
          },
        },
      });
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

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

// CryptoAPIToS3
//
//required
const axios = require("axios").default;
const AWS = require("aws-sdk");

//http request options for prices and health
const optionsBTC = {
  method: "GET",
  url: "https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=BTC&to_currency=USD&apikey=CZP0HTB6USU96P3O",
  headers: {
    "User-Agent": "request",
    "Content-Type": "application/json",
  },
};

const optionsETH = {
  method: "GET",
  url: "https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=ETH&to_currency=USD&apikey=CZP0HTB6USU96P3O",
  headers: {
    "User-Agent": "request",
    "Content-Type": "application/json",
  },
};

const optionsXRP = {
  method: "GET",
  url: "https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=XRP&to_currency=USD&apikey=CZP0HTB6USU96P3O",
  headers: {
    "User-Agent": "request",
    "Content-Type": "application/json",
  },
};

//invoke lambda handler
exports.handler = async () => {
  //http req
  console.log("grabbing http request");
  const btc = await axios.request(optionsBTC);
  const eth = await axios.request(optionsETH);
  const xrp = await axios.request(optionsXRP);
  console.log(btc.data);
  console.log(eth.data);
  console.log(xrp.data);

  console.log("raw response rep transmitting to bucket");

  //stringify response from http
  const jsonBTC = JSON.stringify(btc.data);
  const jsonETH = JSON.stringify(eth.data);
  const jsonXRP = JSON.stringify(xrp.data);
  console.log(jsonBTC);
  console.log(jsonETH);
  console.log(jsonXRP);

  console.log("save response data in json");
  try {
    const s3 = new AWS.S3();

    //s3 bucket info
    const bucketName = "databoxs3223609-datadev";
    const keyNameBTC = "cryptoPricesBTC.json";
    const keyNameETH = "cryptoPricesETH.json";
    const keyNameXRP = "cryptoPricesXRP.json";

    //s3 parameters
    const paramsBTC = {
      Bucket: bucketName,
      Key: keyNameBTC,
      Body: jsonBTC,
    };
    const paramsETH = {
      Bucket: bucketName,
      Key: keyNameETH,
      Body: jsonETH,
    };
    const paramsXRP = {
      Bucket: bucketName,
      Key: keyNameXRP,
      Body: jsonXRP,
    };

    //put jsons in s3
    const resultsBTC = await s3.upload(paramsBTC).promise();
    const resultsETH = await s3.upload(paramsETH).promise();
    const resultsXRP = await s3.upload(paramsXRP).promise();

    console.log(
      "Successfully created " +
        paramsBTC.Key +
        "," +
        paramsXRP.Key +
        " and " +
        paramsETH.Key +
        " and uploaded it to " +
        paramsBTC.Bucket +
        "/" +
        paramsBTC.Key +
        " , " +
        paramsETH.Key +
        " and " +
        paramsXRP.Key
    );
    return { resultsXRP, resultsETH, resultsBTC };
  } catch (err) {
    console.log(err);
  }
};

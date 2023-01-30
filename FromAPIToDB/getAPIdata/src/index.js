const axios = require("axios").default;
const AWS = require("aws-sdk");

const options = {
  method: "GET",
  url: "https://covid-19-data.p.rapidapi.com/totals",
  headers: {
    "x-rapidapi-key": "050eb41d47mshfcc5e8ea511ca06p119d13jsn715975fbb0e7",
    "x-rapidapi-host": "covid-19-data.p.rapidapi.com",
  },
};

exports.handler = async function (event) {
  console.log("grabbing http request");
  const response = await axios.request(options);

  const bucketName = "databoxs3223609-datadev";
  const keyName = "data.json";
  console.log("raw response data transmitting to bucket");
  const json = JSON.stringify(response.data);

  console.log("save response data in json");
  try {
    const client = new AWS.S3();
    const params = {
      Bucket: bucketName,
      Key: keyName,
      Body: json,
    };
    const results = await client.upload(params).promise();
    console.log(
      "Successfully created " +
        params.Key +
        " and uploaded it to " +
        params.Bucket +
        "/" +
        params.Key
    );
    return results;
  } catch (e) {
    console.log(e);
  }
};

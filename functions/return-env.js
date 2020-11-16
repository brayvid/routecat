exports.handler = function(event, context, callback) {
  const { API_KEY } = process.env;
  console.log(API_KEY);
  callback(null, {
    statusCode: 200,
    body: JSON.stringify({ token: API_KEY }),
  });
};

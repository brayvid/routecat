exports.handler = function(event, context, callback) {
  const { API_KEY } = process.env;
  callback(null, {
    statusCode: 200,
    body: JSON.stringify({ token: API_KEY }),
  });
};

var https = require('https')

module.exports = {
  sendHttpRequestMessage: function (options, message) {
      return new Promise(((resolve, reject) => {
        const request = https.request(options, (response) => {
          response.setEncoding('utf8')
          let returnData = ''
    
          if (response.statusCode < 200 || response.statusCode >= 300) {
            return reject(new Error(`${response.statusCode}: ${response.req.getHeader('host')} ${response.req.path}`))
          }
    
          response.on('data', (chunk) => {
            returnData += chunk
          });
    
          response.on('end', (response) => {

            resolve(returnData)
          });
    
          response.on('error', (error) => {
            reject(error);
          });
        });
        if (message) request.write(JSON.stringify(message))
        request.end()
      }));
  }
}
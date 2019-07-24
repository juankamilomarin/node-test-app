const event = {
    "Records": [
      {
        "EventSource": "aws:sns",
        "EventVersion": "1.0",
        "EventSubscriptionArn": "arn:aws:sns:eu-west-1:239990938293:SCEPTRE-REAP-CI-General-Alerting-SNSTopic-1ID5NN97S7HZ8:a125fa32-55be-41bc-ae94-6c23276fba8c",
        "Sns": {
          "Type": "Notification",
          "MessageId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          "TopicArn": "arn:aws:sns:eu-west-1:239990938293:SCEPTRE-REAP-CI-General-Alerting-SNSTopic-1ID5NN97S7HZ8",
          "Subject": "ALARM: \"FROM NODE JS LOCALLY\" in EU - Ireland",
          "Message": "{\"AlarmName\":\"Reporting Service error\",\"AlarmDescription\":\"Example alarm description.\",\"AWSAccountId\":\"000000000000\",\"NewStateValue\":\"OK\",\"NewStateReason\":\"Threshold Crossed: 1 datapoint (10.0) was greater than or equal to the threshold (1.0).\",\"StateChangeTime\":\"2017-01-12T16:30:42.236+0000\",\"Region\":\"EU - Ireland\",\"OldStateValue\":\"ALARM\",\"Trigger\":{\"MetricName\":\"DeliveryErrors\",\"Namespace\":\"ExampleNamespace\",\"Statistic\":\"SUM\",\"Unit\":null,\"Dimensions\":[],\"Period\":300,\"EvaluationPeriods\":1,\"ComparisonOperator\":\"GreaterThanOrEqualToThreshold\",\"Threshold\":1.0}}",
          "Timestamp": "2017-01-12T16:30:42.318Z",
          "SignatureVersion": "1",
          "Signature": "Cg==",
          "SigningCertUrl": "https://sns.eu-west-1.amazonaws.com/SimpleNotificationService-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.pem",
          "UnsubscribeUrl": "https://sns.eu-west-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:eu-west-1:000000000000:cloudwatch-alarms:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          "MessageAttributes": {}
        }
      }
    ]
  }

var https = require('https')

module.exports = {
    main: function(){
        var cloudWatchAlert = JSON.parse(event.Records[0].Sns.Message)
    
        // Do not send any notification if the state didn't change
        if(cloudWatchAlert.NewStateValue === cloudWatchAlert.OldStateValue) return 'No change in state. Notification was not sent'
            
        var slackMessage = getSlackMessage(event.Records[0].Sns, cloudWatchAlert)
    
        var requestOptions = {
            method: 'POST',
            hostname: 'hooks.slack.com',
            path: '/services/' + getSlackHookUrl(event.Records[0].Sns.TopicArn)
        };
    
        sendMessage(requestOptions, slackMessage).then(
            text => {
                console.log(`Success: ${text}`);
            },
            err => {
                console.log(`There was an error: ${err}`);
            }  
        );
    }
}

function sendMessage(options, message) {
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
      request.write(JSON.stringify(message))
      request.end()
    }));
}

function getSlackMessage(sns, cloudWatchAlert){
    return {
        "username": "Reporting service - AWS Alert via Lambda",
        "text": `*${sns.Subject}*`,
        "attachments":[
          {
             "color": `${(cloudWatchAlert.NewStateValue === "OK")?'good':'danger'}`,
             "fields":[
                {
                   "title":`State changed to ${cloudWatchAlert.NewStateValue}`,
                   "value":`Alarm name: ${cloudWatchAlert.AlarmName}\nNew state reason: ${cloudWatchAlert.NewStateReason}\nTopic Arn: ${sns.TopicArn}`,
                   "short":false
                }
             ]
          }
        ]
    }
}

function getSlackHookUrl(arn){
    if(arn === 'arn:aws:sns:eu-west-1:239990938293:SCEPTRE-REAP-CI-General-Alerting-SNSTopic-1ID5NN97S7HZ8'){
        return 'T3GD0HY3H/BKG7Q91CH/l4DoYv8EuNJ8bh3l8RMKPNaj'
    }
    return 'T3GD0HY3H/BKB789VMZ/Tuv4wRxTVPOgXxDG0EDFmgxo'
}
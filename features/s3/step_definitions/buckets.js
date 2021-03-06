module.exports = function() {

  this.Given(/^I am using the S3 "([^"]*)" region$/, function(region, callback) {
    this.s3 = new this.AWS.S3({region: region});
    callback();
  });

  this.Given(/^I am using the S3 "([^"]*)" region with signatureVersion "([^"]*)"$/, function(region, signatureVersion, callback) {
    this.s3 = new this.AWS.S3({region: region, signatureVersion: signatureVersion});
    callback();
  });

  this.When(/^I create a bucket with the location constraint "([^"]*)"$/, function(location, callback) {
    this.bucket = this.uniqueName('aws-sdk-js-integration');
    var params = {
      Bucket: this.bucket,
      CreateBucketConfiguration: {
        LocationConstraint: location
      }
    };
    this.request('s3', 'createBucket', params, callback);
  });

  this.Then(/^the bucket should have a location constraint of "([^"]*)"$/, function(loc, callback) {
    var self = this;
    self.s3.getBucketLocation({Bucket: self.bucket}, function(err, data) {
      if (err) callback.fail(err);
      self.assert.equal(data.LocationConstraint, loc);
      callback();
    });
  });

  this.When(/^I put a bucket CORS configuration$/, function(callback) {
    var params = {
      Bucket: this.bucket,
      CORSConfiguration: {
        CORSRules: [{
          AllowedMethods: ['DELETE', 'POST', 'PUT'],
          AllowedOrigins: ['http://example.com'],
          AllowedHeaders: ['*'],
          ExposeHeaders: ['x-amz-server-side-encryption'],
          MaxAgeSeconds: 5000
        }]
      }
    };
    this.request('s3', 'putBucketCors', params, callback);
  });

  this.When(/^I get the bucket CORS configuration$/, function(callback) {
    this.request('s3', 'getBucketCors', {Bucket: this.bucket}, callback);
  });

  this.Then(/^the AllowedMethods list should inclue "([^"]*)"$/, function(value, callback) {
    this.assert.equal(this.data.CORSRules[0].AllowedMethods.sort().join(' '), 'DELETE POST PUT');
    callback();
  });

  this.Then(/^the AllowedOrigin value should equal "([^"]*)"$/, function(value, callback) {
    this.assert.equal(this.data.CORSRules[0].AllowedOrigins[0], value);
    callback();
  });

  this.Then(/^the AllowedHeader value should equal "([^"]*)"$/, function(value, callback) {
    this.assert.equal(this.data.CORSRules[0].AllowedHeaders[0], value);
    callback();
  });

  this.Then(/^the ExposeHeader value should equal "([^"]*)"$/, function(value, callback) {
    this.assert.equal(this.data.CORSRules[0].ExposeHeaders[0], value);
    callback();
  });

  this.Then(/^the MaxAgeSeconds value should equal (\d+)$/, function(value, callback) {
    this.assert.equal(this.data.CORSRules[0].MaxAgeSeconds, parseInt(value));
    callback();
  });

  this.When(/^I create a bucket with a DNS compatible name that contains a dot$/, function(callback) {
    this.bucket = this.uniqueName('aws-sdk-js.integration');
    this.request('s3', 'createBucket', {Bucket: this.bucket}, callback);
  });

  this.Given(/^I force path style requests$/, function(callback) {
    this.s3 = new this.AWS.S3({s3ForcePathStyle: true});
    callback();
  });

  this.Then(/^the bucket name should be in the request path$/, function(callback) {
    var path = this.response.request.httpRequest.path.split('/');
    this.assert.equal(path[1], this.bucket);
    callback();
  });

  this.Then(/^the bucket name should not be in the request host$/, function(callback) {
    var host = this.response.request.httpRequest.endpoint.host;
    this.assert.compare(host.indexOf(this.bucket), '<', 0);
    callback();
  });

  this.When(/^I put "([^"]*)" to the key "([^"]*)" in the bucket$/, function(data, key, next) {
    var params = {Bucket: this.bucket, Key: key, Body: data};
    this.request('s3', 'putObject', params, next, false);
  });

  this.Then(/^I delete the object "([^"]*)" from the bucket$/, function(key, next) {
    var params = {Bucket: this.bucket, Key: key};
    this.request('s3', 'deleteObject', params, next);
  });

  this.When(/^I put a (small|large) buffer to the key "([^"]*)" in the bucket$/, function(size, key, next) {
    var body = this.createBuffer(size);
    var params = {Bucket: this.bucket, Key: key, Body: body};
    this.request('s3', 'putObject', params, next);
  });

  this.Then(/^the object "([^"]*)" should (not )?exist in the bucket$/, function(key, shouldNotExist, next) {
    var params = { Bucket: this.bucket, Key: key };
    this.eventually(next, function (retry) {
      retry.condition = function() {
        if (shouldNotExist) {
          return this.error && this.error.code === 'NotFound';
        } else {
          return !this.error;
        }
      };
      this.request('s3', 'headObject', params, retry, false);
    });
  });


};

'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const stream = require('stream');
const {
  config,
  getConnection,
  closeConnection
} = require('./hooks/global-hooks');
const pHooks = require('./hooks/put-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('Put method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('Put setup hook', async function() {
    hookSftp = await getConnection('put-hook');
    sftp = await getConnection('put');
    return true;
  });

  after('Put cleanup hook', async function() {
    await pHooks.putCleanup(hookSftp, config.sftpUrl);
    await closeConnection('put', sftp);
    await closeConnection('put-hook', hookSftp);
    return true;
  });

  it('Put should return a promise', function() {
    return expect(
      sftp.put(Buffer.from('blah'), join(config.sftpUrl, 'mocha-put-buffer.md'))
    ).to.be.a('promise');
  });

  it('Put large text file', function() {
    return sftp
      .put(
        join(config.localUrl, 'test-file1.txt'),
        join(config.sftpUrl, 'mocha-put-string.md')
      )
      .then(() => {
        return sftp.stat(join(config.sftpUrl, 'mocha-put-string.md'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 6973257});
      });
  });

  it('Put data from buffer into remote file', function() {
    return sftp
      .put(Buffer.from('hello'), join(config.sftpUrl, 'mocha-put-buffer.md'), {
        encoding: 'utf8'
      })
      .then(() => {
        return sftp.stat(join(config.sftpUrl, 'mocha-put-buffer.md'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 5});
      });
  });

  it('Put data from stream into remote file', function() {
    let str2 = new stream.Readable();
    str2._read = function noop() {};
    str2.push('your text here');
    str2.push(null);

    return sftp
      .put(str2, join(config.sftpUrl, 'mocha-put-stream.md'), {
        encoding: 'utf8'
      })
      .then(() => {
        return sftp.stat(join(config.sftpUrl, 'mocha-put-stream.md'));
      })
      .then(stats => {
        return expect(stats).to.containSubset({size: 14});
      });
  });

  it('Put with no src file should be rejected', function() {
    return expect(
      sftp.put(
        join(config.localUrl, 'no-such-file.txt'),
        join(config.sftpUrl, 'mocha-put-no-file.txt')
      )
    ).to.be.rejectedWith('no such file or directory');
  });

  it('Put with bad dst path should be rejected', function() {
    return expect(
      sftp.put(
        join(config.localUrl, 'test-file1.txt'),
        join(config.sftpUrl, 'bad-directory', 'bad-file.txt')
      )
    ).to.be.rejectedWith('No such file');
  });
});
//app.js
var ck = require('./coinkite-helper'),
    cosigners = [{"user":"Coinkite","refnum":"(Coinkite cosigner refnum)","xpubkey":"tpub? oDWA6Nup"},
        {"user":"Bitcore","refnum":"(Bitcore cosigner refnum)","xpubkey":"tpub? vhM6SvNg"},
        {"user":"Backup","refnum":"(Backup cosigner refnum)","xpubkey":"tpub? GLqXFYPn"}],
    xprivKey = 'your extended (hd) private key here';

//STEP 1
function newSendRequest(amount, destination) {
    ck.request('/v1/new/send', 'PUT', {
        account: 'Coinfabrik',
        amount: amount,
        dest: destination
    }, function(error, response, body) {
        if(error) throw error;
        var requestRefnum = body.result.CK_refnum;
        console.log('Request refnum: ' + requestRefnum);
        askCoinkiteSignature(requestRefnum);
    });
}

//STEP 2
function askCoinkiteSignature(requestRefnum) {
    console.log('Requesting Coinkite cosigner\'s signature...');
    ck.request('/v1/co-sign/' + requestRefnum + '/' + cosigners[0].refnum + '/sign', 'PUT', {},
        function(error, response, body) {
            if(error) throw error;
            console.log(JSON.stringify(body));
            signWithBitcore(requestRefnum, function(error) {
                if (error) throw error;
                console.log('Transaction signed by both parties!');
            });
        });
}

//STEP 3
function signWithBitcore(requestRefnum, callback) {
    ck.request('/v1/co-sign/' + requestRefnum + '/' + cosigners[1].refnum, 'GET', {}, function(error, response, body) {
        if (error) return callback(error);
        console.log('Sending Bitcore signatures...');
        ck.request('/v1/co-sign/' + requestRefnum + '/' + cosigners[1].refnum + '/sign', 'PUT', {
            signatures: getSignatures(body.signing_info)
        }, callback);
    });
}

//SIGNATURES
var bitcore = require('bitcore'),
    assert = require('assert');

function getSignatures(signingInfo) {
    return signingInfo.input_info.map(function(input, index) {
        var sighash = signingInfo.inputs[index][1],
            pathIndex = input.sp,
            address = signingInfo.req_keys[pathIndex][0],
            privateKey = new bitcore.HDPrivateKey(xprivKey, bitcore.Networks.testnet)
                .derive(input.full_sp)
                .privateKey;
        assert(signingInfo.inputs[index][0] == pathIndex);
        assert(privateKey.toAddress().toString() == address);
        return [
            getSignature(privateKey, sighash),
            sighash,
            pathIndex
        ]
    });
}

function getSignature(bitcorePrivateKey, sighash) {
    var b = new Buffer(sighash, 'hex');
    var sig = bitcore.crypto.ECDSA.sign(b, bitcorePrivateKey).set({nhashtype: 1});
    return sig.toString('hex') + '01';//01 = SIGHASH_ALL
}


//UTILITIES
function logAccountDetails(accountName) {
    ck.request('/v1/account/' + accountName, 'GET', {}, function (error, response, body) {
        if (error) throw error;
        var cosigners = body.account.cosigners.map(function (c) {
            return {
                user: c.user_label,
                refnum: c.CK_refnum,
                xpubkey: c.xpubkey
            };
        });
        console.log(JSON.stringify(cosigners));
    });
}

function cancelRequest(requestRefnum, success) {
    ck.request('/v1/update/' + requestRefnum + '/cancel_send', 'PUT', {}, function(error, response, body) {
        if (error) throw error;
        console.log('Request canceled.');
        success();
    });
}

//RUN!
newSendRequest(0.001, '2NFFS15hQTJAf6RpoTwchfZZWBigitXgfrM');
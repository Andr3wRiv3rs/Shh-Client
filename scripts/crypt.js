let RSA = require('node-rsa');
let AES = require('aes-js');
let crypto = require('crypto');

global.crypt = {
    rsa_keypair: () => {
        try{
            let r = new RSA({b: 1024});
            return [r.exportKey('pkcs8-public'),r];
        } catch(e){}
    },

    rsa_fromkey: k => {
        try{
            let r = new RSA();
            r.importKey(k, 'pkcs8');
            return [r.exportKey('pkcs8-public'),r];
        } catch(e){}
    },

    aes_keygen: () => {
        try{
        let str = [];
        for(let i=0;i<32;i++){
            str.push(Math.round(Math.random()*78)+48);
        }
        return new Buffer(str).toString('utf8');
        }catch(e){}
    },

    aes_encrypt: (k,s) => {
        try{
        let b = st => (AES.utils.utf8.toBytes(st));
        k = b(k);
        s = b(s);
        let a = new AES.ModeOfOperation.ctr(k);
        return a.encrypt(s);
        }catch(e){console.log(e)}
    },

    aes_decrypt: (k,s) => {
        try{
        let b = st => (AES.utils.utf8.toBytes(st));
        k = b(k);
        let a = new AES.ModeOfOperation.ctr(k);
        return AES.utils.utf8.fromBytes(a.decrypt(s));
        }catch(e){console.log(e)};
    },

    aes: function (k) {
        this.key = global.crypt.aes_keygen();

        if(k){
            this.key = k;
        }

        this.encrypt = s => (global.crypt.aes_encrypt(this.key,s));
        this.decrypt = s => (global.crypt.aes_decrypt(this.key,s));
    },

    rsa: function (k) {
        

        if(k){
            this.key = global.crypt.rsa_fromkey(k);
        } else {
            this.key = global.crypt.rsa_keypair();
        }

        this.public = this.key[0];

        this.encrypt = (pk,s) => {
            return crypto.publicEncrypt(pk, Buffer.from(s,'utf8'));
        };

        this.encryptString = (pk,s) => {
            return this.encrypt(pk,s).toString('base64');
        };

        this.decrypt = (s) => {
            return this.key[1].decrypt(s, 'utf8');
        };

        this.decryptString = (s) => {
            return this.decrypt(Buffer.from(s,'base64'));
        };
    },

    md5: require('md5')
}
let fs = require('fs');

let log = d => {
    if(global.config.debug){
        console.log(d);
    }
};

global.appdata = {
    configured: false,
    config: {}
};

let path = process.env.APPDATA+'\\Shh';

global.ws = (s,p,se) => {
    let pf='ws://'; if(se==1){pf='wss://'}
    let ws = new WebSocket(pf+s+':'+p);

    return {
        on: (s,c) => {
            switch(s){
                case 'open':
                    ws.onopen = c;
                    break;
                case 'close':
                    ws.onclose = c;
                    break;
                case 'error':
                    ws.onerror  = c;
                    break;
                case 'data':
                    ws.onmessage = (d)=>{c(d.data)};
                    break;
            }
        },

        send: (s)=>{
            ws.send(j.s(s));
        },

        WebSocket: ws
    }
};

global.tunnel = (p,u) => {
    if(!fs.existsSync(path)){
        fs.mkdirSync(path);
    }
    
    fs.readdir(path, (err, files) => {

        files.forEach(f => {
            if(f==='config.json'){
                global.appdata.configFound=true;
            }
        });

        if(global.appdata.configFound){
            log('Configuration found.')
            global.appdata.config=require(path+'\\config.json');
            log('Loaded configuration file.');
        }

        u=u||global.appdata.config.username;

        global.appdata.config.username=u;

        global.initiated=Date.now();

        log('Initiation sequence started. ');

        let cfg = global.config;
        let ws = global.ws(cfg.server, cfg.port, cfg.secure);
        global.GlobalWS = ws;
        
        global.sendWS = (t,d) => {
            let m = j.s({t:t,d:d});

            if(m.length<64){
                global.GlobalWS.send({
                    t:'e',
                    d: global.rsa.encryptString(global.config.pk, m)
                });
            } else {
                let body = '';
                global.util.ssplit(m,64,(o)=>{
                    body+=global.rsa.encryptString(global.config.pk, o.m[1])+'$';
                },()=>{
                    global.util.ssplit(body,4096,(o)=>{
                        global.GlobalWS.send({
                            t:'f',
                            d: [o.m,o.hash]
                        });
                    },()=>{},250)
                });
            }
        };

        ws.on('data', global.data);

        ws.on('open', ()=>{
            log('Unencrypted data channel established with WebSocket server. ');
            
            let aes = new global.crypt.aes(global.crypt.md5(p));

            let auth = false;

            if(!global.appdata.configFound){
                global.rsa = new global.crypt.rsa();

                global.appdata.config = {
                    username: global.getUsername(),
                    pk: Buffer.from(global.rsa.public,'utf8').toString('base64'),
                    k: Buffer.from(aes.encrypt(global.rsa.key[1].exportKey('pkcs8'))).toString('base64'),
                    contacts: {}
                };

                fs.writeFileSync(path+'\\config.json',j.s(global.appdata.config),{encoding:'utf8'});
                log('Created new configuration file.')

                auth=true;
            } else {
                try{
                    global.rsa = new global.crypt.rsa(aes.decrypt(new Uint8Array(Buffer.from(global.appdata.config.k,'base64'))));
                    auth=true;
                } catch(e){
                    log('Invalid password. Please try again.')
                    auth=false;
                }
            }
            if(auth){
                ws.send({t:'init', d: {
                    key: global.rsa.public,
                    id: u
                }});

                log('RSA Keypair generated and sent. ');
            }
        });

        ws.on('error', e => {
            console.warn(e);
        });

        ws.on('close', () => {
            log('Tunnel: Connection to server has been closed.');
        });
    });
}
let messages = {};
let candidates = {};

let log = d => {
    if(global.config.debug){
        console.log(d);
    }
};
global.offers = {};

global.offer = u => {
    global.network.connect(u,opened,global.w_data);
    console.log('Sent connection offer to '+u+'. Awaiting response.');
};

global.doAnswer = (d) => {
    let c = doWRTC(opened,global.w_data);
    global.conn = c;
    c.remote.id=d.d.peer;
    global.conns[d.d.peer]=c;

    c.doAnswer(d.d.offer,(r,e)=>{

        if(candidates[d.d.peer]){
            for(let i in candidates[d.d.peer]){
                global.conns[d.d.peer].pc.addIceCandidate(new RTCIceCandidate(candidates[d.d.peer][i]));
            }
        }

        global.sendWS('answer',{
            peer: d.d.peer,
            answer: r,
        })
    });
};

global.answer = u => {
    global.doAnswer(global.offers[u]);
    delete global.offers[u];
};

global.data = d => {
    try{
        d = j.p(d);
    } catch(e) {
        d = {
            t: null
        }
    }

    switch(d.t){
        case 'log':
            log(d);
            break;
        case 'init':
            global.config.pk = d.d.key;
            global.sendWS('ping',{});
            log('Recieved public key from WebSocket server.');
            break;
        case 'offer':
            offerHandler(d);
            break;
        case 'answer':
            global.conns[d.d.peer].setRemote(d.d.answer);
            
            if(candidates[d.d.peer]){
                for(let i in candidates[d.d.peer]){
                    global.conns[d.d.peer].pc.addIceCandidate(new RTCIceCandidate(candidates[d.d.peer][i]));
                }
            }

            answerHandler(d);
            break;
        case 'candidate':
            if(candidates[d.d.peer]){
                candidates[d.d.peer].push(d.d.candidate);
            } else {
                candidates[d.d.peer]=[d.d.candidate];
            }
            break;
        case 'e':
            try{
                d=j.p(global.rsa.decryptString(d.d));
                t = d.t;
                d = d.d;
                switch(t){
                    case 'pong':
                        log('Established encrypted connection to WebSocket server. ');
                        log('Time: ' +((parseInt(Date.now())-parseInt(global.initiated))/1000)+'s');
                        log('Username is '+global.appdata.config.username);
                        break;
                        
                }
            }catch(e){log(e)};
            break;
        case 'f':
            d=d.d;
            let mid=d[1];
            let id=d[0][0];
            let body = '';
            
            if(!messages[mid]){messages[mid]={}};

            switch(d[0][0]){
                case '$':
                    d=d[0][1].split('$');
                    for(let i in d){
                        body+=rsa.decrypt(Buffer.from(d[i],'base64')).toString('utf8');
                    }
                    let ks = Object.keys(messages[mid]);
                    ks.sort(function(a, b){return a-b});
                    let nb = '';
                    for(i in ks){
                        nb+=messages[mid][ks[i]];
                    }
                    nb+=body;
                    global.data(nb);
                    delete messages[mid];
                    break;
                default:
                    d=d[0][1].split('$');
                    for(let i in d){
                        body+=rsa.decrypt(Buffer.from(d[i],'base64')).toString('utf8');
                    }
                    messages[mid][id]=body;
            }
            break;
    }
};


global.w_data = (d,s) => {
    try{
        d = j.p(d);
    } catch(e) {
        d = {
            t: null
        }
    }

    se = (pk,d) => {
        s({t:'e',d:global.rsa.encrypt(pk,j.s(d))});
    };

    switch(d.t){
        case 'ping':
            se(d.d,{
                d: global.aes.key,
                t: 'pong'
            });
            break;

        case 'message':
            global.message(d.d);
            break;

        case 'e':
            try{
                d=j.p(global.rsa.decryptString(d.d));
                t = d.t;
                d = d.d;
                switch(t){
                    case 'ping':
                        se(d.d,{
                            d: global.aes.key,
                            t: 'pong'
                        });

                        
                        global.broadcast = data => {
                            global.util.ssplit(Buffer.from(global.aes.encrypt(j.s(data))).toString('base64'),8192,d=>{
                                global.network.broadcast({
                                    t: 'f',
                                    i: d.m[0],
                                    h: d.hash,
                                    d: d.m[1]
                                });
                            },d=>console.log('Done!',d));
                        }
                        break;
                    case 'pong':
                        global.aes = new global.crypt.aes();
                        global.aes.key = d;

                        global.broadcast = data => {
                            global.util.ssplit(Buffer.from(global.aes.encrypt(j.s(data))).toString('base64'),8192,d=>{
                                global.network.broadcast({
                                    t: 'f',
                                    i: d.m[0],
                                    h: d.hash,
                                    d: d.m[1]
                                });
                            },d=>console.log('Done!',d));
                        }
                        break;
                }
            }catch(e){log(e)};
            break;
        case 'f':
            try{
                if(!messages[d.h]){messages[d.h]={}};
                if(d.i == '$'){
                    let body = '';
                    let ks = Object.keys(messages[d.h]).sort();
                    for(let i in ks){
                        body += messages[d.h][ks[i]];
                    }
                    body += d.d;
                    body = new Uint8Array(Buffer.from(body,'base64'));
                    global.w_data(global.aes.decrypt(body));
                } else {
                    messages[d.h][d.i] = d.d;
                }
            }catch(e){console.warn(e)};
            break;
        default: 
            log(d); 
            break;
    }
}

let options = {
    hosting: false,
    aa: false
};

global.host = (o,p,u) => {
    options.aa = o.aa || false;
    options.hosting = true;
    
    global.aes = new global.crypt.aes();

    global.tunnel(p,u);

    global.broadcast = (d) => {
        global.network.broadcast({t:'a', d:Buffer.from(global.aes.encrypt(j.s(d))).toString('base64')});
    };
};

let offerHandler = d => {
    if(options.hosting){
        global.offers[d.d.peer] = d;
        if(options.aa){
            global.answer(d.d.peer);
        } else {
            log('User with ID '+d.d.peer+' attempted to establish a connection. \n\nTo answer, do global.answer(\''+d.d.peer+'\')');
            
        }
    }
};

let answerHandler = d => {

};

let opened = d => {
    if(!options.hosting){
        global.network.broadcast({
            d: global.rsa.public,
            t: 'ping'
        });
    } else {
        
    }
};
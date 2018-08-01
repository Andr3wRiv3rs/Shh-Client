global.send = () => {};
global.local = {id: ''};
global.conns = {};

let log = d => {
    if(global.config.debug){
        console.log(d);
    }
};

let RTCPeerConnection = webkitRTCPeerConnection || RTCPeerConnection;

global.doWRTC = (opened,data) => {
    let dc,pc,rdc;
    let remote = {id: ''};

    pc = new RTCPeerConnection();
    pc.onicecandidate = (event) => { 
        if (event.candidate) { 
            global.sendWS("candidate",{
                candidate: event.candidate,
                peer: remote.id
            });
        } 
    };

    let doOffer = (p,c) => {
        c=c||function(){};
        remote.id=p;
        pc.createOffer(
            o => {
                c(o,false);
                setLocal(o);
                global.sendWS('offer',{
                    offer: o,
                    peer: p
                });
            },
            e => {c(false,o)}
        );
    };

    let doAnswer = (o,c) => {
        setRemote(o);
        c=c||function(){};
        pc.createAnswer(
            o => {
                setLocal(o);
                c(o,false);
            },e => {c(false,e)}
        );
    }

    let setRemote = (o) => {pc.setRemoteDescription(new RTCSessionDescription(o))};
    let setLocal = (o) => {pc.setLocalDescription(new RTCSessionDescription(o))};

    pc.ondatachannel = function(ev) {
        ev.channel.onopen = function() {
            rdc = ev.channel;
            log('Data channel for ID '+remote.id+' is active.');
            rdc.onerror = (error) => { log("Error:", error) };
            rdc.onmessage = (event) => { try{data(event.data,send)}catch(e){console.warn(e)} };
            rdc.onclose = (e) => { };
            opened();
        };
    };

    dc = pc.createDataChannel("main", { reliable:true });
    dc.onerror = (e) => { log("Error:", e) };

    send = json => { dc.send(j.s(json)) };

    return {pc,dc,send,doAnswer,setRemote,doOffer,remote};
}; 

global.network = {};

global.network.connect = (p,opened,d) => {
    let c = global.doWRTC(opened, d);
    c.remote.id=p;
    global.conns[p]=c;
    c.doOffer(p);
    global.conn = c;
};

global.network.broadcast = j => {
    let k = Object.keys(global.conns);
    for(let i in k){
        global.conns[k[i]].send(j);
    }
};

global.network.host = {
    opened: () => {},
    data: () => {}
}
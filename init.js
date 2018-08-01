let j = {
    s: st => (JSON.stringify(st)),
    p: st => (JSON.parse(st))
};

let image = require('./scripts/image');

let inits = ['webrtc','ws','data','crypt'];

global.util = {};

global.config = require('./config.json')
global.config.username = "Guest";
global.getUsername = ()=>(global.config.username+'@'+global.crypt.md5(global.rsa['public']));

for(let i in inits){
    require('./scripts/'+inits[i]+'.js');
}

global.util.ssplit = (m,l,e,c,d) => {
    let marr = [];
    c=c||function(){};
    e=e||function(){};
    let mid = global.crypt.md5(m);
    d=d||0;
    m=m.split('');
    let i = 0;
    let nint = setInterval(()=>{
        let str = '';
        if(m.length>l){
            for(let z=0;z<l;z++){
                str+=m[z];
            }
            m.splice(0,l);
            marr.push([i,str]);
            e({m:[i,str],hash:mid});
        } else {
            for(let z in m){
                str+=m[z];
            }
            marr.push(['$',str]);
            e({m:['$',str],hash:mid});
            c({a:marr,hash:mid})

            clearInterval(nint);
        }
        i+=1;
    },d);
}
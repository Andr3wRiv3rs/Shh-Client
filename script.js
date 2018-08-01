let $ = e => (document.querySelector(e));

let chat = new Vue({
    el: '.chat',
    data: {
        messages: [
            {
                message:'Hi! How are you?',
                username:'Username', 
                avatar:'https://aaa.aaa'
            }
        ]
    }
});

global.onmessage = d => {
    chat.messages.push({

    });
};
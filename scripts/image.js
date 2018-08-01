exports.create = s => {
    let i = document.createElement('IMG');
    i.src = s;
    return {
        width: i.width,
        height: i.height,
        el: i
    }
}

exports.encode = el => {
    let c = document.createElement('CANVAS');
    let ctx = c.getContext('2d');
    c.width = el.width;
    c.height = el.height;
    ctx.drawImage(el,0,0);

    return c.toDataURL()
}
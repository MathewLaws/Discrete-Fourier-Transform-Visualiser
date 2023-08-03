let time = 0;
let fourier;
let path = [];
let x = [];
let setupDone = false;
let rInput;
let input = 1600; // number of input samples
let K;
const E = 1000; // number of cirlces
let viewbox;
const q = 20000 // number of output samples

let speed = document.getElementById("speed") 
let zoom = document.getElementById("zoom")
let follow = document.getElementById("follow")
let oneSet = document.getElementById("oneSet")

let openFile = (e) => {

    let reader = new FileReader();

    reader.readAsBinaryString(e.target.files[0]);

    reader.onload = function(){

        let new_xml = (new DOMParser).parseFromString(reader.result, "image/svg+xml")

        svg = new_xml.documentElement

        let points = svg.querySelector("path")

        viewbox = svg.viewBox.baseVal

        rInput = points.getTotalLength()
        //input = Math.ceil(rInput / 2)

        P = Array.from({length: input}, (_, i) => {
            const {x, y} = points.getPointAtLength(i / input * rInput);
            return [x - viewbox.width / 2, y - viewbox.height / 2];
        })

        for (let i=0; i<P.length; i++) {
            x.push(new Complex(P[i]["0"], P[i]["1"]))
        }

        fourier = dft(x)

        setupDone = true
    };

};


async function drawing(){

    svg = await fetch("https://gist.githubusercontent.com/mbostock/a4fd7a68925d4039c22996cc1d4862ce/raw/d813a42956d311d73fee336e1b5aac899c835883/fourier.svg")
        .then(response => response.text())
        .then(text => (new DOMParser).parseFromString(text, "image/svg+xml"))
        .then(svg => svg.documentElement);
    
    console.log(svg)

    let path2 = svg.querySelector("path")
    console.log(path2)
    
    viewbox = svg.viewBox.baseVal

    console.log(svg.viewBox)

    rInput = path2.getTotalLength()
    input = Math.ceil(rInput / 2)

    P = Array.from({length: input}, (_, i) => {
        const {x, y} = path2.getPointAtLength(i / input * rInput);
        return [x - viewbox.width / 2, y - viewbox.height / 2];
    })

    return P
}



class Complex {
    constructor(r, i) {
        this.r = r
        this.i = i
    }

    add(n) {
        const new_r = this.r + n.r
        const new_i = this.i + n.i
        return new Complex(new_r, new_i)
    }

    multiply(n) {
        const new_r = (this.r * n.r) - (this.i * n.i)
        const new_i = (this.r * n.i) + (this.i * n.r)
        return new Complex(new_r, new_i)
    }

    expim() {
        return new Complex(Math.cos(this.i), Math.sin(this.i));
    }
}

let expim = (n) => {
    return new Complex(Math.cos(n), Math.sin(n));
}

function dft(d) {

    K = Int16Array.from({length: E}, (_, i) => (1 + i >> 1) * (i & 1 ? -1 : 1))

    let X = Array.from(K, k => {
        
        let sum = new Complex(0,0)

        for (let n = 0, N = d.length; n < N; n++) {
            sum = sum.add(d[n].multiply(expim(k * n / N * -TWO_PI)))
        }

        sum.r = sum.r / input
        sum.i = sum.i / input

        return sum
    })
    
    return X
}

async function setup() {
    let optionsHeight = document.querySelector("#options").offsetHeight

    speed.value = 10
    zoom.value = 5
    follow.checked = false
    oneSet.checked = true

    let canvas = createCanvas(windowWidth, windowHeight-optionsHeight);

    canvas.parent("container")
}

function epicycles(x, y, fourier) {
    const scale2 = parseInt(zoom.value)/10 * x / viewbox.width;
    const a = time * 2 / q * PI;
    
    let p = new Complex(0,0)
    for (let i = 0; i < E; ++i) {
        p = p.add(fourier[i].multiply(expim(a * K[i])));
    }

    translate(x, y);
    scale(scale2);
    if (follow.checked) translate(-p.r, -p.i);

    noFill();
    stroke(80);

    for (let i = 0, p = new Complex(0,0); i < E; ++i) {
        const r = Math.hypot(fourier[i].r, fourier[i].i);
        ellipse(p.r, p.i,(r*2));
        p = p.add(fourier[i].multiply(expim(a * K[i])));
    }

    stroke(80);
    for (let i = 0, p = new Complex(0,0); i < E; ++i) {
        let prevP = p;
        p = p.add(fourier[i].multiply(expim(a * K[i])));
        line(prevP.r, prevP.i,p.r, p.i);
    }

    beginShape();
    noFill();
    stroke(255)
    if (path.length < q) path.push([p.r, p.i]);
    for (let i = 1, n = path.length; i < n; ++i) {
        vertex(...path[i]);
    }
    endShape();
}


function draw() {
    background(0);
    if (setupDone) {
        epicycles(windowWidth/2, windowHeight/2, fourier)

        time += parseInt(speed.value)
    }
}
  

const alikstr = "cgb! aesndjncndkfjbfvkndnkvn"
const re = RegExp('(cgb)\!', 'g')
const res = re.test(alikstr)

if(res){
    console.log("benar")
}else{   
    console.log("salah")
}

var str = "The best things in life are free";
var patt = new RegExp("e");
var res2 = patt.test(str);
console.log(res2)
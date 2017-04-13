module kt.util {

    export function addToSet(array: Array<any>, value: any) {
        if (array.indexOf(value) === -1) {
            array.push(value);
        }
    }

    export function deleteFromSet(array: Array<any>, value: any) {
        var index = array.indexOf(value);
        if (index !== -1) {
            array.splice(index, 1);
        }
    }


    export function replaceArrayObservably(oldArr: Array<any>, newArr: Array<any>) {
        oldArr.splice(0);
        if (newArr) {
            for (let p of newArr) {
                oldArr.push(p);
            }
        }
    }

}

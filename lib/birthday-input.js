export function formatBirthdayInput(value){
 const digits=value.replace(/\D/g,'').slice(0,8);
 return [digits.slice(0,4),digits.slice(4,6),digits.slice(6,8)].filter(Boolean).join('.');
}
export function birthdayCaret(value,digitCount){
 if(!digitCount)return 0;
 let count=0;
 for(let i=0;i<value.length;i++)if(/\d/.test(value[i])&&++count===digitCount)return i+1;
 return value.length;
}

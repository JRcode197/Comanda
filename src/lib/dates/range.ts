import {Temporal} from '@js-temporal/polyfill';
export function calendarRange(date:string,view:string,timezone:string){
 let start=Temporal.PlainDate.from(date);
 if(view==='month')start=start.with({day:1});
 const end=view==='month'?start.add({months:1}):start.add({days:view==='day'?1:7});
 return {from:start.toZonedDateTime(timezone).toInstant().toString(),to:end.toZonedDateTime(timezone).toInstant().toString()};
}

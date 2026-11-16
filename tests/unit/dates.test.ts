import {expect,it} from 'vitest';
import {calendarRange} from '../../src/lib/dates/range';
it('uses Europe/Rome boundaries across spring DST (23 hours)',()=>{const r=calendarRange('2027-03-28','day','Europe/Rome');expect(r).toEqual({from:'2027-03-27T23:00:00Z',to:'2027-03-28T22:00:00Z'});});
it('uses calendar month boundaries, including February',()=>{const r=calendarRange('2027-02-15','month','Europe/Rome');expect(r).toEqual({from:'2027-01-31T23:00:00Z',to:'2027-02-28T23:00:00Z'});});

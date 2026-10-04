import { matchesUnpaidSearch } from '../unpaidSearch';
const account = {name:'Émilie Ben Ali',className:'5e A',parentName:'Frédéric Ali',parentPhone:'+216 22 345 678'};
it('matches accents, multi-word queries in any order and class plus name', () => {
 expect(matchesUnpaidSearch(account,'emilie')).toBe(true);
 expect(matchesUnpaidSearch(account,'ali emilie')).toBe(true);
 expect(matchesUnpaidSearch(account,'5e emilie')).toBe(true);
 expect(matchesUnpaidSearch(account,'frederic')).toBe(true);
 expect(matchesUnpaidSearch(account,'emilie 3b')).toBe(false);
});
it('matches formatted phone numbers and Arabic digits', () => {
 expect(matchesUnpaidSearch(account,'22 345 678')).toBe(true);
 expect(matchesUnpaidSearch(account,'٢٢٣٤٥٦٧٨')).toBe(true);
 expect(matchesUnpaidSearch(account,'99999999')).toBe(false);
});
it('ignores Arabic vowels and normalizes alef without matching unrelated names', () => {
 expect(matchesUnpaidSearch({name:'أحْمَد علي'},'احمد')).toBe(true);
 expect(matchesUnpaidSearch({name:'أحْمَد علي'},'فاطمة')).toBe(false);
 expect(matchesUnpaidSearch({name:'أحْمَد علي'},'  ')).toBe(true);
});

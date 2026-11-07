import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import HniaPaymentEditor from '../components/HniaPaymentEditor';
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets:()=>({bottom:24})}));
let renderer, onReview, onClose;
const text=()=>renderer.root.findAllByType(Text).map(n=>String(n.props.children)).join(' ');
const button=label=>renderer.root.findAllByType(TouchableOpacity).find(n=>n.findAllByType(Text).some(t=>t.props.children===label));
const field=label=>renderer.root.findAllByType(TextInput).find(n=>n.props.accessibilityLabel===label);
const review={type:'student',beneficiary:'Yasmine Ben Salah · 1A',choices:[{key:'TUITION:2026-11',kind:'TUITION',label:'Scolarité',period:'2026-11',due:200},{key:'TRANSPORT:2026-12',kind:'TRANSPORT',label:'Transport',period:'2026-12',due:100},{key:'REGISTRATION:2026-2027',kind:'REGISTRATION',label:'Inscription',period:'2026-2027',due:150}]};
const render=async(r=review,args={},language='fr')=>{await act(async()=>{renderer=TestRenderer.create(<HniaPaymentEditor review={r} args={args} language={language} onReview={onReview} onClose={onClose}/>)});};
beforeEach(()=>{onReview=jest.fn();onClose=jest.fn()});afterEach(()=>act(()=>renderer?.unmount()));
it('selects tuition and an advance bus month, edits line amounts, and submits only for review',async()=>{
 await render(review,{items:[],paymentMethod:'Espèces',paidOn:'2026-11-07'});
 expect(onReview).not.toHaveBeenCalled();
 act(()=>renderer.root.findAllByType(TouchableOpacity).find(n=>n.props.accessibilityLabel==='Scolarité 2026-11').props.onPress());
 act(()=>field('Montant reçu · 2026-11').props.onChangeText('125,500'));
 act(()=>button('Transport').props.onPress());
 act(()=>renderer.root.findAllByType(TouchableOpacity).find(n=>n.props.accessibilityLabel==='Transport 2026-12').props.onPress());
 act(()=>button('Virement').props.onPress());
 act(()=>button('Vérifier les modifications').props.onPress());
 expect(onReview).toHaveBeenCalledWith({items:[{kind:'TUITION',period:'2026-11',amount:125.5},{kind:'TRANSPORT',period:'2026-12',amount:100}],paymentMethod:'Virement',paidOn:'2026-11-07'});
 expect(onClose).toHaveBeenCalledTimes(1);
});
it('rejects empty selections, overpayments and excessive precision',async()=>{
 await render();act(()=>button('Vérifier les modifications').props.onPress());expect(onReview).not.toHaveBeenCalled();
 act(()=>renderer.root.findAllByType(TouchableOpacity).find(n=>n.props.accessibilityLabel==='Scolarité 2026-11').props.onPress());
 for(const amount of ['201','-5','1,1234']){act(()=>field('Montant reçu · 2026-11').props.onChangeText(amount));act(()=>button('Vérifier les modifications').props.onPress());expect(onReview).not.toHaveBeenCalled()}
 expect(text()).toContain('Vérifiez les montants');
});
it('edits teacher salary period, amount and advance without making a payment',async()=>{
 await render({type:'teacher',beneficiary:'Leila Ben Amor',remaining:375},{month:11,year:2026,amount:375,isAdvance:false});
 act(()=>button('Avance').props.onPress());act(()=>field('Montant à verser · TND').props.onChangeText('100,125'));act(()=>field('Mois (1–12)').props.onChangeText('12'));
 act(()=>button('Vérifier les modifications').props.onPress());expect(onReview).toHaveBeenCalledWith({month:12,year:2026,amount:100.125,isAdvance:true});
});
it('supports both overtime modes, preserving genuine hours only in hourly entries',async()=>{
 await render({type:'overtime',beneficiary:'Leila Ben Amor'},{month:11,year:2026,mode:'hourly',hours:2,rate:15});
 act(()=>field('Heures à ajouter').props.onChangeText('3,5'));act(()=>field('Taux · TND/h').props.onChangeText('20'));act(()=>button('Vérifier les modifications').props.onPress());expect(onReview).toHaveBeenLastCalledWith({month:11,year:2026,mode:'hourly',hours:3.5,rate:20});
 act(()=>button('Montant forfaitaire').props.onPress());act(()=>field('Montant à ajouter · TND').props.onChangeText('75,125'));act(()=>button('Vérifier les modifications').props.onPress());expect(onReview).toHaveBeenLastCalledWith({month:11,year:2026,mode:'fixed',amount:75.125});expect(text()).toContain('Cet ajout ne verse aucun salaire.');
});
it.each(['en','ar'])('provides localized review controls in %s',async lang=>{await render(review,{},lang);expect(button(lang==='ar'?'مراجعة التعديلات':'Review changes')).toBeDefined();expect(onReview).not.toHaveBeenCalled()});

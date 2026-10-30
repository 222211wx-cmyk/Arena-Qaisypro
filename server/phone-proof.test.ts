// @vitest-environment node
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
const {verify}=vi.hoisted(()=>({verify:vi.fn()}));
vi.mock('firebase-admin/app',()=>({getApps:()=>[],initializeApp:(options:any)=>({options})}));
vi.mock('firebase-admin/auth',()=>({getAuth:()=>({verifyIdToken:verify})}));
// @ts-ignore server JavaScript module
import {recoveryPublicConfig,verifyPhoneProof} from './phone-proof.js';
const token=Buffer.from(JSON.stringify({alg:'RS256',kid:'verified-key'})).toString('base64url')+'.payload.signature';
let decoded:any;
beforeEach(()=>{
 vi.stubEnv('FIREBASE_WEB_CONFIG',JSON.stringify({projectId:'real-project',apiKey:'public-key',authDomain:'real-project.firebaseapp.com'}));
 vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST','');vi.stubEnv('FIREBASE_EMULATOR_HUB','');
 decoded={aud:'real-project',iss:'https://securetoken.google.com/real-project',sub:'phone-owner',uid:'phone-owner',phone_number:'+15550001111',firebase:{sign_in_provider:'phone'},iat:Math.floor(Date.now()/1000),auth_time:Math.floor(Date.now()/1000)};
 verify.mockImplementation(async()=>decoded);
});
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
it('uses verified provider output, with stable event digest across token refreshes',async()=>{
 const first=await verifyPhoneProof(token);decoded.iat+=1;
 expect((await verifyPhoneProof(token)).eventDigest).toBe(first.eventDigest);
 expect(first.phone).toBe(decoded.phone_number);expect(verify).toHaveBeenCalledWith(token);
});
it.each(['email','old','future','audience','tenant'])('rejects invalid %s proof claims',async kind=>{
 if(kind==='email')decoded.firebase.sign_in_provider='password';
 if(kind==='old')decoded.auth_time-=1000;
 if(kind==='future'){decoded.auth_time+=1000;decoded.iat+=1000;}
 if(kind==='audience')decoded.aud='another-project';
 if(kind==='tenant')decoded.firebase.tenant='another-tenant';
 await expect(verifyPhoneProof(token)).rejects.toThrow();
});
it('rejects unsigned tokens before calling Firebase',async()=>{
 await expect(verifyPhoneProof(Buffer.from('{"alg":"none"}').toString('base64url')+'.payload.')).rejects.toThrow();
 expect(verify).not.toHaveBeenCalled();
});
it('never enables production recovery against an emulator',()=>{
 vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST','localhost:9099');expect(recoveryPublicConfig()).toBeNull();
});

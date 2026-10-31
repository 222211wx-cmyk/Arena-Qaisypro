import {afterEach,expect,it,vi} from 'vitest';
import {trackAppHistory,navigationDepth,navigateForward} from './back-navigation';
afterEach(()=>vi.restoreAllMocks());
it('does not trust a same-site referrer as proof of tracked browser history',()=>{
 history.replaceState({},'', '/learn');
 vi.spyOn(document,'referrer','get').mockReturnValue(location.origin+'/');
 const stop=trackAppHistory();expect(navigationDepth()).toBe(0);
 const forward=vi.spyOn(history,'forward');navigateForward();expect(forward).not.toHaveBeenCalled();stop();
});
it('allows forward only within the tracked app history and clears it on a new branch',()=>{
 history.replaceState({},'', '/');const replace=history.replaceState;const stop=trackAppHistory();
 history.pushState({},'', '/learn');expect(navigationDepth()).toBe(1);
 history.pushState({},'', '/souk');expect(navigationDepth()).toBe(2);
 replace.call(history,{__arenaNavigationDepth:1},'', '/learn');
 window.dispatchEvent(new PopStateEvent('popstate'));
 const forward=vi.spyOn(history,'forward').mockImplementation(()=>{});
 navigateForward();expect(forward).toHaveBeenCalledTimes(1);
 history.pushState({},'', '/stories');navigateForward();expect(forward).toHaveBeenCalledTimes(1);stop();
});

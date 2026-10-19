import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchesSetting} from '../scripts/character-settings.mjs';

test('alternate Ultimate search accepts shorthand and requires every keyword',()=>{
 for(const query of ['alt','alt ult','custom burst','alternative finisher']) assert.equal(matchesSetting(query,'Alternate Ultimate builder custom orb art'),true,query);
 assert.equal(matchesSetting('alt ult','Energy Ultimate maximum charge'),false);
 assert.equal(matchesSetting('alt ult portrait','Alternate Ultimate counter'),false);
});
test('art search finds image-related synonyms without matching unrelated fragments',()=>{
 for(const text of ['Combat portrait artwork crop','Skill button image','Enhanced token skin visual','Splash illustration']) assert.equal(matchesSetting('art',text),true,text);
 assert.equal(matchesSetting('art','Party membership starts enabled'),false);
 assert.equal(matchesSetting('picture zoom','Combat portrait image scale'),true);
});
test('search tolerates a typo and a transposition, and supports code field names',()=>{
 assert.equal(matchesSetting('portriat','Combat HUD portrait'),true);
 assert.equal(matchesSetting('splaash art','Ultimate splash artwork'),true);
 assert.equal(matchesSetting('enhanced ult','enhancedUltimateEnabled'),true);
 assert.equal(matchesSetting('zzzzzz','Energy Ultimate'),false);
});

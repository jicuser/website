import test from 'node:test';
import assert from 'node:assert/strict';
import {normaliseTVLayout,tvGridTemplate} from '../src/lib/tvLayoutModel.js';
test('defaults to a safe full screen prayer layout',()=>{assert.deepEqual(normaliseTVLayout(),{orientation:'landscape',layout:'full',contents:['prayer'],primarySize:50});});
test('rejects unknown layout types and content',()=>{assert.deepEqual(normaliseTVLayout({orientation:'invalid',layout:'bad',contents:['html']}),normaliseTVLayout());});
test('landscape split uses two side-by-side zones',()=>{assert.equal(tvGridTemplate({layout:'split',primarySize:65}).gridTemplateColumns,'65fr 35fr');});
test('portrait split stacks zones',()=>{assert.equal(tvGridTemplate({layout:'split',orientation:'portrait'}).gridTemplateRows,'50fr 50fr');});
test('triple portrait stacks three equal zones',()=>{assert.equal(tvGridTemplate({layout:'triple',orientation:'portrait'}).gridTemplateRows,'repeat(3,minmax(0,1fr))');});
test('primary size is clamped',()=>{assert.equal(normaliseTVLayout({layout:'split',primarySize:999}).primarySize,75);});

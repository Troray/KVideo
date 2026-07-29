import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanHtmlText } from '../lib/utils/format-utils';

test('cleanHtmlText handles empty or null input', () => {
  assert.equal(cleanHtmlText(''), '');
  assert.equal(cleanHtmlText(null), '');
  assert.equal(cleanHtmlText(undefined), '');
});

test('cleanHtmlText decodes &nbsp; and converts long consecutive spaces to paragraph breaks', () => {
  const dirty = '前所未有的触动…… &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;　　该剧根据同名人气漫画改编。';
  const expected = '前所未有的触动……\n\n该剧根据同名人气漫画改编。';
  assert.equal(cleanHtmlText(dirty), expected);
});

test('cleanHtmlText handles HTML paragraph tags and line breaks', () => {
  const dirty = '<p>第一段内容<br/>第二行</p><p>第二段内容&nbsp;&nbsp;&nbsp;详细介绍</p>';
  const expected = '第一段内容\n第二行\n\n第二段内容\n\n详细介绍';
  assert.equal(cleanHtmlText(dirty), expected);
});

test('cleanHtmlText decodes numeric and named HTML entities', () => {
  const dirty = 'Title &amp; Subtitle &#39;Quote&#39; &lt;Tag&gt; &quot;Text&quot;&nbsp;Space';
  const expected = 'Title & Subtitle \'Quote\' <Tag> "Text" Space';
  assert.equal(cleanHtmlText(dirty), expected);
});


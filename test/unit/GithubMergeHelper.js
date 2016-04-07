import GithubMergeHelper from '../../src/GithubMergeHelper';

describe('GithubMergeHelper', () => {
  describe('Instantiation', () => {
    it('shouldn\'t explode', () => {
      new GithubMergeHelper();
      expect(true);
    });

  });
});

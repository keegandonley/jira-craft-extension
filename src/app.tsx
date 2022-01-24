import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { CraftBlock, HasSubblocks } from '@craftdocs/craft-extension-api';
import BlockBuilder from './builder';

const App: React.FC<{}> = () => {
  const [apiKey, setApiKey] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [apiUrl, setUrl] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>('');

  const retrieveKey = React.useCallback(async () => {
    const result = await craft.storageApi.get('jira-api-key');
    if (result.status === 'success') {
      setApiKey(result.data);
    }
  }, []);

  const retrieveEmail = React.useCallback(async () => {
    const result = await craft.storageApi.get('jira-email');
    if (result.status === 'success') {
      setEmail(result.data);
    }
  }, []);

  const retrieveUrl = React.useCallback(async () => {
    const result = await craft.storageApi.get('jira-url');
    if (result.status === 'success') {
      setUrl(result.data);
    }
  }, []);

  React.useEffect(() => {
    retrieveKey();
    retrieveEmail();
    retrieveUrl();
  }, [retrieveKey, retrieveEmail, retrieveUrl]);

  const handleChangeKey = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setApiKey(e.target.value);
      craft.storageApi.put('jira-api-key', e.target.value);
    },
    []
  );

  const handleChangeEmail = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
      craft.storageApi.put('jira-email', e.target.value);
    },
    []
  );

  const handleChangeUrl = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUrl(e.target.value);
      craft.storageApi.put('jira-url', e.target.value);
    },
    []
  );

  const getIssueData = React.useCallback(
    async (url: string) => {
      try {
        const [, ticket] = url.split('browse/');
        const token = btoa(`${email}:${apiKey}`);
        const res = await craft.httpProxy.fetch({
          url: `https://${apiUrl}.atlassian.net/rest/api/2/issue/${ticket}`,
          method: 'GET',
          headers: {
            Authorization: `Basic ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const data = await res.data?.body?.json();
        return data;
      } catch (ex: any) {
        setError(ex?.message ?? 'An unknown error ocurred');
      }
    },
    [email, apiKey, apiUrl]
  );

  const findAndProcessJira = React.useCallback(
    async (block: CraftBlock, pageId: string): Promise<boolean[]> => {
      if (block.type === 'urlBlock') {
        const url = block.originalUrl ?? block.url ?? '';
        const ticket = await getIssueData(url);
        if (ticket) {
          const summary = ticket?.fields?.summary ?? '{Summary}';
          const key = ticket?.key ?? '{Key}';
          const assignee = ticket?.fields?.assignee?.displayName ?? '{Assignee}';

          const builder = new BlockBuilder(pageId, block);

          const blocks = [
            builder.createIssueTitleBlock(key, summary),
            builder.createAssigneeBlock(assignee)
          ];

          await builder.add(blocks);

          await builder.deleteParent();
        }
      } else if ((block as HasSubblocks).subblocks) {
        const result = await Promise.all(
          (block as HasSubblocks).subblocks.map((child: CraftBlock) =>
            findAndProcessJira(child, pageId)
          )
        );

        return result.map(Boolean);
      }
      return [];
    },
    [getIssueData]
  );

  const getDocument = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await craft.dataApi.getCurrentPage();
      if (result.status === 'success') {
        const pageBlock = result.data;
        await findAndProcessJira(pageBlock, pageBlock.id);
      } else {
        setError('Could not find a document');
      }
    } finally {
      setLoading(false);
    }
  }, [findAndProcessJira]);

  return (
    <div className="flex flex-col w-full px-2">
      <div className="py-4 px-6 w-full flex flex-col">
        <div>Enter Your Jira URL:</div>
        <div className="flex items-center">
          <input
            className="border rounded-md px-2 py-1 flex-grow"
            type="text"
            value={apiUrl}
            onChange={handleChangeUrl}
          />
          <span className="text-gray-500 ml-1">.atlassian.net</span>
        </div>
      </div>
      <div className="py-4 px-6 w-full flex flex-col">
        <div>Enter Your Email:</div>
        <input
          className="border rounded-md px-2 py-1 flex-grow"
          type="text"
          value={email}
          onChange={handleChangeEmail}
        />
      </div>
      <div className="py-4 px-6 w-full flex flex-col">
        <div>Enter your API Key:</div>
        <input
          className="border rounded-md px-2 py-1 flex-grow"
          type="password"
          value={apiKey}
          onChange={handleChangeKey}
        />
      </div>
      <div className="mx-auto">
        {loading ? (
          <div>Processing...</div>
        ) : (
          <button
            onClick={getDocument}
            disabled={!email || !apiKey}
            className="shadow p-2 bg-gray-500 rounded-md text-white disabled:bg-gray-300"
          >
            Process Jira Data
          </button>
        )}
      </div>
      <div className="mx-auto text-red-500">
        {error}
      </div>
    </div>
  );
};

export function initApp() {
  ReactDOM.render(<App />, document.getElementById('react-root'));
}

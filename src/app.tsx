import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { CraftBlock } from '@craftdocs/craft-extension-api';

const App: React.FC<{}> = () => {
  const [key, setKey] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [apiUrl, setUrl] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);

  const retrieveKey = React.useCallback(async () => {
    const result = await craft.storageApi.get('jira-api-key');
    if (result.status === 'success') {
      setKey(result.data);
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
      setKey(e.target.value);
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
      const [, ticket] = url.split('browse/');
      const token = btoa(`${email}:${key}`);
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
    },
    [email, key, apiUrl]
  );

  const findJiraBlock = React.useCallback(
    async (block: any, pageId: string) => {
      if (block.type === 'urlBlock') {
        const id = block.id;
        const url = block.originalUrl;
        const ticket = await getIssueData(url);
        if (ticket) {
          const summary = ticket?.fields?.summary;
          const key = ticket?.key;
          const assignee = ticket?.fields?.assignee;

          const issueTitleBlock = craft.blockFactory.textBlock({
            content: [
              {
                text: key,
                highlightColor: 'cyan',
                isBold: true,
              },
              {
                text: ' - ',
              },
              {
                text: summary,
              },
            ],
            indentationLevel: block.indentationLevel,
            listStyle: block.listStyle,
          });

          const assigneeBlock = craft.blockFactory.textBlock({
            content: [
              {
                text: 'Assignee: ',
                isBold: false,
              },
              {
                text: assignee?.displayName,
                highlightColor: 'sunsetGradient',
                isBold: true,
              },
            ],
            indentationLevel: block.indentationLevel + 1,
            listStyle: block.listStyle,
          });

          const linkBlock = craft.blockFactory.textBlock({
            content: [
              {
                text: 'Open in Jira',
                link: {
                  type: 'url',
                  url,
                },
                highlightColor: 'nightSkyGradient',
              },
            ],
            indentationLevel: block.indentationLevel + 1,
            listStyle: block.listStyle,
          });

          await craft.dataApi.addBlocks(
            [issueTitleBlock, assigneeBlock, linkBlock],
            {
              type: 'afterBlockLocation',
              pageId,
              blockId: id,
            }
          );

          await craft.dataApi.deleteBlocks([id]);
        }
      } else if (block.subblocks) {
        await Promise.all(
          block.subblocks.map((child: CraftBlock) =>
            findJiraBlock(child, pageId)
          )
        );
      }
    },
    [getIssueData]
  );

  const getDocument = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await craft.dataApi.getCurrentPage();
      if (result.status === 'success') {
        const pageBlock = result.data;
        await findJiraBlock(pageBlock, pageBlock.id);
      }
    } finally {
      setLoading(false);
    }
  }, [findJiraBlock]);

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
          value={key}
          onChange={handleChangeKey}
        />
      </div>
      <div className="mx-auto">
        {loading ? (
          <div>Processing...</div>
        ) : (
          <button
            onClick={getDocument}
            disabled={!email || !key}
            className="shadow p-2 bg-gray-500 rounded-md text-white disabled:bg-gray-300"
          >
            Process Jira Data
          </button>
        )}
      </div>
    </div>
  );
};

export function initApp() {
  ReactDOM.render(<App />, document.getElementById('react-root'));
}

import { CraftBlock, CraftBlockInsert } from "@craftdocs/craft-extension-api";

const ISSUE_KEY_HIGHLIGHT_COLOR = 'cyan';
const ISSUE_ASSIGNEE_COLOR = 'sunsetGradient';

class BlockBuilder {
	private pageId: string;
	private parent: CraftBlock;
	private url: string;

	constructor(pageId: string, parent: CraftBlock) {
		this.pageId = pageId;
		this.parent = parent;

		if (this.parent.type === 'urlBlock') {
			this.url = this.parent.originalUrl ?? this.parent.url ?? '';
		} else {
			this.url = '';
		}
	}

	public add = async (blocks: CraftBlockInsert[]) => {
		const result = await craft.dataApi.addBlocks(blocks, {
			type: 'afterBlockLocation',
			pageId: this.pageId,
			blockId: this.parent.id
		});

		return result;
	};

	public createIssueTitleBlock = (issueKey: string, issueTitle: string) => {
		const block = craft.blockFactory.textBlock({
			content: [
				{
					text: issueKey,
					highlightColor: ISSUE_KEY_HIGHLIGHT_COLOR,
					isBold: true,
					link: {
						type: 'url',
						url: this.url
					}
				}, {
					text: ' - '
				}, {
					text: issueTitle
				}
			],
			indentationLevel: this.parent.indentationLevel,
			listStyle: this.parent.listStyle,
		});
		return block;
	};

	public createAssigneeBlock = (displayName: string) => {
		const block = craft.blockFactory.textBlock({
			content: [
				{
					text: 'Assignee: ',
					isBold: false
				},
				{
					text: displayName,
					highlightColor: ISSUE_ASSIGNEE_COLOR,
					isBold: true,
				}
			],
			indentationLevel: this.parent.indentationLevel + 1
		});

		return block;
	};

	public deleteParent = async () => {
		return craft.dataApi.deleteBlocks([this.parent.id]);
	}
}

export default BlockBuilder;

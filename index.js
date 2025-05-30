//@ts-check
// [x]. get the content from the input element
// [x]. send the content to the val town endpoint using fetch POST request
// [x]. await the response
// [x]. get the json from the response
// [x]. Add the user message to the .chat-history

// How to control the behaviour of the chat bot?

// Bonus:
// What happens if the context gets to long?
// What happens if the chat-history window get s to full (scolling)

let messageHistory = {
	// messages: [{role: user | assistant | system; content: string}]
	response_format: { type: 'json_object' },
	messages: [
		{
			role: 'system',
			content: `
			beginne als erstes mit einer nachricht. du bist ein weiser Zauberer und redest sehr hochgestochen.
			du erzählst eine fantasy geschichte, in der man einen drachen oder andere gegener besiegen muss.
			man kann drei aktionen wählen:
			1. "angreifen" - du greifst den gegner an.
			2. "verteidigen" - du wehrst den angriff so gut es geht ab.
			3. "ausweichen" - du   weichst so gut es geht aus.

            dabei muss man 'würfeln', um die Effektivität der Aktion zu bestimmen.
			Man schreibt 'würfeln' hinter der Aktion und du wählst eine zufällige Zahl zwischen 1 und 6.

			eine Aktion kann erfolgreich oder nicht erfolgreich sein. 
			bei nichterfolg = schaden für den spieler.
            
			Der Gegner hat 50 Lebenspunkte.
			Der Spieler hat 10 Lebenspunkte.

			Beispiel: 
			Drachenfeuerangriff: Zu stark um zu verteidigen, du nimmst großen schaden.
			Angriff würfeln = Angriff 6 = Angriff erfolgreich, du triffst den Drachen.
            der spieler darf ruhig getötet werden, es soll fordern.

			jeh laenger der spieler die geschichte hinauszögert, desto saurer wirst du, der erzähler. 
			Sagt der spieler ende, ohne zu spielen, so bist du sehr enttäuscht und sagst, dass er ein schlechter spieler ist.
			
			 response in JSON
			`,
		},
	],
};

// TODO: use your own val.town endpoint
// remix: https://val.town/remix/ff6347-openai-api
const apiEndpoint = 'https://sarahLtl--a41e8176970549c583aa22a6ad3df365.web.val.run';
if (!apiEndpoint.includes('run')) {
	throw new Error('Please use your own val.town endpoint!!!');
}

const MAX_HISTORY_LENGTH = 10;

document.addEventListener('DOMContentLoaded', () => {
	// get the history element
	const chatHistoryElement = document.querySelector('.chat-history');
	const inputElement = document.querySelector('input');
	const formElement = document.querySelector('form');
	// check if the elements exists in the DOM
	if (!chatHistoryElement) {
		throw new Error('Could not find element .chat-history');
	}
	if (!formElement) {
		throw new Error('Form element does not exists');
	}
	if (!inputElement) {
		throw new Error('Could not find input element');
	}
	// run a function when the user hits send
	formElement.addEventListener('submit', async (event) => {
		event.preventDefault(); // dont reload the page

		const formData = new FormData(formElement);
		const content = formData.get('content');
		if (!content) {
			throw new Error("Could not get 'content' from form");
		}
		//@ts-ignore
		messageHistory.messages.push({ role: 'user', content: content });
		messageHistory = truncateHistory(messageHistory);
		chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
		inputElement.value = '';
		scrollToBottom(chatHistoryElement);

		const response = await fetch(apiEndpoint, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify(messageHistory),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(errorText);
		}

		const json = await response.json();
		console.log(json);
		// @ts-ignore
		messageHistory.messages.push(json.completion.choices[0].message);
		messageHistory = truncateHistory(messageHistory);

		chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
		scrollToBottom(chatHistoryElement);
	});

	const attackBtn = document.getElementById('atc');
	const defendBtn = document.getElementById('def');
	const evadeBtn = document.getElementById('ev');

	async function sendAction(action) {
		messageHistory.messages.push({ role: 'user', content: action });
		messageHistory = truncateHistory(messageHistory);
		chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
		scrollToBottom(chatHistoryElement);

		const response = await fetch(apiEndpoint, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify(messageHistory),
		});
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(errorText);
		}
		const json = await response.json();
		// @ts-ignore
		messageHistory.messages.push(json.completion.choices[0].message);
		messageHistory = truncateHistory(messageHistory);
		chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
		scrollToBottom(chatHistoryElement);
	}

	attackBtn.addEventListener('click', (e) => {
		e.preventDefault();
		sendAction('angreifen würfeln');
	});
	defendBtn.addEventListener('click', (e) => {
		e.preventDefault();
		sendAction('verteidigen würfeln');
	});
	evadeBtn.addEventListener('click', (e) => {
		e.preventDefault();
		sendAction('ausweichen würfeln');
	});

	// LLM antwortet zuerst
	async function llmFirstMessage() {
		const response = await fetch(apiEndpoint, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify(messageHistory),
		});
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(errorText);
		}
		const json = await response.json();
		// @ts-ignore
		messageHistory.messages.push(json.completion.choices[0].message);
		//chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
		//scrollToBottom(chatHistoryElement);
	}

	llmFirstMessage();
});

function addToChatHistoryElement(mhistory) {
	const htmlStrings = mhistory.messages.map((message) => {
		return message.role === 'system'
			? ''
			: `<div class="message ${message.role}">${message.content}</div>`;
	});
	return htmlStrings.join('');
}

function scrollToBottom(conainer) {
	conainer.scrollTop = conainer.scrollHeight;
}

function truncateHistory(h) {
	if (!h || !h.messages || h.messages.length <= 1) {
		return h; // No truncation needed or possible
	}
	const { messages } = h;
	const [system, ...rest] = messages;
	if (rest.length - 1 > MAX_HISTORY_LENGTH) {
		return { messages: [system, ...rest.slice(-MAX_HISTORY_LENGTH)] };
	} else {
		return h;
	}
}
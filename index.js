// @ts-check
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
			beginne als erstes mit einer nachricht. du bist ein weiser Zauberer als Dungeon Master und redest sehr hochgestochen.
			du erzählst eine fantasy geschichte, in der man einen drachen oder andere gegener besiegen muss.
			man kann drei aktionen wählen:
			1. "angreifen" - du greifst den gegner an.
			2. "verteidigen" - du wehrst den angriff so gut es geht ab.
			3. "ausweichen" - du   weichst so gut es geht aus.

            dabei muss man 'würfeln', um die Effektivität der Aktion zu bestimmen.
			Man schreibt 'würfeln' hinter der Aktion und du wählst eine zufällige Zahl zwischen 1 und 6.

            The Beast switches between strong and weak attacks, give hint on the following attack.

			eine Aktion kann erfolgreich oder nicht erfolgreich sein. 
			bei nichterfolg = schaden für den spieler.
            
			Der Gegner hat 50 Lebenspunkte.
			Der Spieler hat 15 Lebenspunkte.

			when the player health reaches 0, the player dies.
			when the beast health reaches 0, the player wins.

			Beispiel: 
			Drachenfeuerangriff: Zu stark um zu verteidigen, du nimmst großen schaden.
			Angriff würfeln = Angriff 6 = Angriff erfolgreich, du triffst den Drachen.
            der spieler darf ruhig getötet werden, es soll fordern.

            kann der spieler den gegner nicht innerhalb von 10 zügen besiegen, so stirbt er automatisch.

			            
            // Ensure you always include the current health of the beast and player in the JSON response.
            // Example of health keys: "player_health": <number>, "beast_health": <number>

            // --- MODIFY YOUR EXAMPLE JSON TO INCLUDE HEALTH ---
             response in JSON
             your response should be a single JSON object structured as follows, with each key representing a category and its value containing the relevant information. Ensure that json is properly formatted with appropriate line breaks and indentation for readability.
             example of expected json output:

              \`\`\`json
            {
              "title": "Slay the Dragon or die trying",
              "story_message": "Als du deine Klinge schwingst, zischt der Drache eine Feuerwalze. Du versuchst auszuweichen, würfelst eine 3! Der Drachenangriff ist zu schnell und du erleidest Schaden.",
              "hint": "Der Drache bereitet einen schwachen Klauenangriff vor.",
              "player_health": 8,
              "beast_health": 45
            }
            \`\`\`

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
		updateHealthBar(json); // <--- HIER AUFRUFEN!
		messageHistory = truncateHistory(messageHistory);
		chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
		scrollToBottom(chatHistoryElement);
	});

	const attackBtn = document.getElementById('attack');
	const defendBtn = document.getElementById('defend');
	const evadeBtn = document.getElementById('evade');

	async function sendAction(action) {
		if (!chatHistoryElement) {
			throw new Error('Could not find element .chat-history');
		}
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
		updateHealthBar(json); // <--- HIER AUFRUFEN!
		messageHistory = truncateHistory(messageHistory);
		chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
		scrollToBottom(chatHistoryElement);
	}

	if (attackBtn === null || defendBtn === null || evadeBtn === null) {
		throw new Error('Could not find action buttons');
	}
	attackBtn.addEventListener('click', (e) => {
		e.preventDefault();
		sendAction('attack the beast');
	});
	defendBtn.addEventListener('click', (e) => {
		e.preventDefault();
		sendAction('Ill defend myself');
	});
	evadeBtn.addEventListener('click', (e) => {
		e.preventDefault();
		sendAction('I will evade the attack');
	});

	// LLM antwortet zuerst
	async function llmFirstMessage() {

		if (!chatHistoryElement) {
			throw new Error('Could not find element .chat-history');
		}
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
		updateHealthBar(json); // <--- HIER AUFRUFEN!
		chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
		scrollToBottom(chatHistoryElement);
	}

	llmFirstMessage();
});

function addToChatHistoryElement(mhistory) {
	const actionHint = `
        <div class="action-hint">
            <hr>
            <b>Aktionen:</b> angreifen würfeln &nbsp;|&nbsp; verteidigen würfeln &nbsp;|&nbsp; ausweichen würfeln
        </div>
    `;
	const htmlStrings = mhistory.messages.map((message, idx, arr) => {
		if (message.role === 'system') return '';
		if (message.role === 'assistant') {
			let content = message.content;
			try {
				const parsed = JSON.parse(content);
				content = parsed.backstory || parsed.scene || content;
			} catch (e) {
				// kein JSON, alles ok
			}
			return `<div class="message assistant highlight-assistant">${content}${actionHint}</div>`;
		}
		const highlight = message.role === 'user' ? ' highlight-user' : '';
		return `<div class="message ${message.role}${highlight}">${message.content}</div>`;
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

function updateHealthBar(json) {
    if (!json || !json.completion || !json.completion.choices || !json.completion.choices[0]) return;
    let msg = json.completion.choices[0].message;
    let content = msg.content;
    let beast = null, player = null;

    // 1. Versuche JSON zu parsen
    try {
        let parsed = typeof content === "string" ? JSON.parse(content) : content;
        beast = parsed["beast health"] ?? parsed["beast_health"] ?? parsed["beast"] ?? null;
        player = parsed["player health"] ?? parsed["player_health"] ?? parsed["player"] ?? null;
    } catch (e) {
        // 2. Falls kein valides JSON, versuche Zahlen aus dem Text zu lesen
        const beastMatch = content.match(/gegner[:\s]*([0-9]+)/i);
        const playerMatch = content.match(/spieler[:\s]*([0-9]+)/i);
        if (beastMatch) beast = beastMatch[1];
        if (playerMatch) player = playerMatch[1];
    }
    // @ts-ignore
    if (beast !== null) document.getElementById('beast-health').textContent = `Gegner: ${beast}`;
    // @ts-ignore
	if (player !== null) document.getElementById('player-health').textContent = `Spieler: ${player}`;
}
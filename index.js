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
			content:
				`
			you start the adventure with a message. you are a prestigous but sarcastic wizard and Dungeon Master. You always talk very pompously and with a lot of flair.
			you tell of an adventure in which the player must kill a ferochious beast.
			the player can choose to act between three actions:
			1. "attack" - you attack the beast with a simple attack.
			2. "defend" - you defend yourself as good as you can.
			3. "fireball" - a powerful attack that can be used ONCE per fight. If you try again you take small damage and fireball is not available anymore.

            to each action you throw a dice to estimate the effectiveness of the action.
            you choose a random number between 1 and 20 to simulate the dice roll.

            The Beast switches between strong and weak attacks also differing in the damage, give a hint on the following attack so the player can prepare.

			an action can be successful or not. 
			a bad roll equals more damage for the player.
			good rolls equal more damage to the beast.

            if the player does not choose one of the three actions, the beast attacks with a strong attack.

			when the player sends specifically the sentence: 'knock knock' the beast will kill him instantly with a smash.
            
            the beast has 50 health points.
            the player hat 15 health points.
			when the player health reaches 0, the player dies and the any action is not possible anymore.
			when the beast health reaches 0, the player wins and you gratulate the player.

    
             response in JSON  
		     

             your response should be a single JSON object structured as follows, with each key representing a category and its value containing the relevant information. Ensure that json is properly formatted with appropriate double line breaks and indentation for readability
             example of expected json output:
              \`\`\`json
            {
              "title": "Slay the Dragon or die trying"

              "story_message": "Als du deine Klinge schwingst, zischt der Drache eine Feuerwalze. Du versuchst auszuweichen, würfelst eine 3! Der Drachenangriff ist zu schnell und du erleidest Schaden."

              "hint": "the beast will summon a strong attack.",
              
			  "player-health": 8,
			  
              "beast-health": 45,
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
	const fireballBtn = document.getElementById('fireball');

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

	if (attackBtn === null || defendBtn === null || fireballBtn === null) {
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
	fireballBtn.addEventListener('click', (e) => {
		e.preventDefault();
		sendAction('FIREBALL!');
		fireballBtn.classList.add('used');
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

	const tryAgainBtn = document.getElementById('try-again');
	if (tryAgainBtn) {
		tryAgainBtn.addEventListener('click', () => {
			location.reload();
		});
	}
});

function addToChatHistoryElement(mhistory) {
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
            // Entferne hier das actionHint!
            return `<div class="message assistant highlight-assistant">${content}</div>`;
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
    let content = json.completion.choices[0].message.content;
    console.log("LLM-Output für Healthbar:", content);

    let beast = null, player = null;

    // Zeilen aufsplitten (auch doppelte Absätze werden so erkannt)
    const lines = content.split(/\n+/);

    // Jede Zeile auf player_health oder beast_health prüfen (mit oder ohne Komma)
    for (const line of lines) {
        const match = line.match(/^\s*(player[_ ]?health|beast[_ ]?health|player|beast)\s*:\s*(\d+)\s*,?\s*$/i);
        if (match) {
            if (match[1].toLowerCase().includes('player')) player = match[2];
            if (match[1].toLowerCase().includes('beast')) beast = match[2];
        }
    }

    // Setze die Werte im DOM (achte auf die richtigen IDs im HTML!)
   //@ts-ignore
	if (beast !== null) document.getElementById('beast_health').textContent = `Beast: ${beast}`;
      //@ts-ignore
	if (player !== null) document.getElementById('player_health').textContent = `Player: ${player}`;
}



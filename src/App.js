import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
const uuidv4 = require('uuid/v4');


const PUBLISHER_ID = 'open';
const BROADCAST_ID = 'speak';
const INFOCASTER_API_BASE_URL = 'https://infocaster-stage.lcc.infomaker.io/v1';
const PUBLISHER_BASE_URL = `${INFOCASTER_API_BASE_URL}/publisher/${PUBLISHER_ID}`;
const PUBLISH_URL = `${PUBLISHER_BASE_URL}/broadcast/${BROADCAST_ID}/publish`;
const SESSION_URL = `${PUBLISHER_BASE_URL}/session`;
const CLIENT_ID = uuidv4();
class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      username: CLIENT_ID,
      connected: false,
      channel: 'general',
      clients: [{
        username: CLIENT_ID,
        id: CLIENT_ID,
        lastCheckIn: Date.now()
      }],
      sound: true,
      text: '',
      lang: 'sv-SE',
      validLangs: [
        {
          flag: '🇩🇪',
          displayName: 'German',
          code: 'de-DE'
        },
        {
          flag: '🇩🇰',
          displayName: 'Danish',
          code: 'da-DK'
        },
        {
          flag: '🇺🇸',
          displayName: 'English',
          code: 'en-US'
        },
        {
          flag: '🇬🇧',
          displayName: 'English',
          code: 'en-GB'
        },
        {
          flag: '🇪🇸',
          displayName: 'Spanish',
          code: 'es-ES'
        },
        {
          flag: '🇫🇮',
          displayName: 'Finnish',
          code: 'fi-FI'
        },
        {
          flag: '🇫🇷',
          displayName: 'French',
          code: 'fr-FR'
        },
        {
          flag: '🇳🇴',
          displayName: 'Norwegian',
          code: 'nb-NO'
        },
        {
          flag: '🇷🇺',
          displayName: 'Russian',
          code: 'ru-RU'
        },
        {
          flag: '🇸🇪',
          displayName: 'Swedish',
          code: 'sv-SE'
        },
      ],
      subscribeUrl: '',
    };
  }

  componentDidMount() {
    this.connect().then(source => {
      this.listenOnEventSource(source);
    });
  }

  render() {
    return (
      <div className='App'>

        <input className='channelInput' placeholder='Channel' value={this.state.channel}
          onChange={this.handleChannelChange.bind(this)} />

        <input className='textInput' placeholder='Input the stuff. ✌' value={this.state.text}
          onChange={this.handleInputChange.bind(this)}
          onKeyPress={this.handleInputKeypress.bind(this)} />

        <select className='selectLang' onChange={this.handleSelectLangChange.bind(this)} value={this.state.lang} name='selectLang'>
          {this.state.validLangs.sort((x, y)=> x.displayName > y.displayName).map(item => {
            return <option value={item.code}> {item.flag} {item.displayName}</option>
          }) }
        </select>

        <div className='soundCheckbox'>
          <input type='checkbox' id='soundCheckbox' className='soundCheckbox' name='sound' onChange={this.handleSoundCheckboxChange.bind(this)} checked={this.state.sound} />
          <label for='soundCheckbox'>Speak on my device</label>
        </div>

        <pre className='commandPre'>{
`curl -X POST -H "Content-Type: application/json" -d '
  {
    "text":"xyz",
    "lang":"en-US"
  }' ${PUBLISH_URL}`
}</pre>
        <ul>
          {this.state.clients.map(client => {
            return <li>{client.username}</li>;
          })}
        </ul>
        <span className='poweredBy'>Powered by <strong>Infomaker LCC</strong></span>
      </div>
    );
  }

  connect() {
    return new Promise((resolve, reject) => {
      if(this.state.connected) {
        return resolve();
      }

      const source = new EventSource(SESSION_URL);

      source.onerror = (e) => {
        console.error('EventSource error', e.target.readyState, e, JSON.stringify(e));
      };


      source.onopen = (e) => {
        console.info(e);
        this.setState({ connected : true });
        return resolve(source);
      };
    });
  }

  listenOnEventSource(source) {
    source.onmessage = (e) => {
      console.log("Received event", e.data);

      let parsedData = JSON.parse(e.data);

      switch(parsedData.type) {
        case 'sessionInit':
          this.setState({
            webhookUrl : parsedData.data.webhookUrl,
            sessionSecret : parsedData.data.sessionSecret,
            destination : parsedData.data.destination,
            subscribeUrl: `${INFOCASTER_API_BASE_URL}/instance/${parsedData.data.destination.instanceId}/v1/publisher/${PUBLISHER_ID}/broadcast/${BROADCAST_ID}/subscribe`
          });

          this.subscribe();
          break;

        case 'subscribed':
          this.joinChannel(parsedData.data.filter.channel);
          break;
        case 'unsubscribed':
          this.leaveChannel(parsedData.data.filter.channel);
          break;
        case 'broadcastPublish':
          if(parsedData.data && parsedData.data.payload) {
            const payload = typeof parsedData.data.payload === 'object' ? parsedData.data.payload : JSON.parse(parsedData.data.payload);
            this.handleMessage(payload);
          }
          break;
        default:
          console.log('Received unknown event', e);
      }
    };
  };

  subscribe() {
    console.log("Subscribing to ", this.state.channel)
    fetch(this.state.subscribeUrl,
    {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        cors: true,
        method: 'POST',
        body: JSON.stringify({
          sessionId: this.state.destination.sessionId,
          sessionSecret: this.state.sessionSecret,
          sendConfirmationToSession: true,
          filters: [
            {
              channel: this.state.channel
            }
          ]
        })
    })
    .then(function(res){ console.log('subscribe success', res) })
    .catch(function(res){ console.log('subscribe failure', res) })
   }

  unsubscribe() {
    fetch(this.state.subscribeUrl,
      {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          cors: true,
          method: 'DELETE',
          body: JSON.stringify({
            sessionId: this.state.destination.sessionId,
            sessionSecret: this.state.sessionSecret,
            sendConfirmationToSession: true,
            filters: [
              {
                channel: this.state.channel
              }
            ]
          })
      })
      .then(function(res){ console.log('unsubscribe success', res) })
      .catch(function(res){ console.log('unsubscribe failure', res) })
  }

  handleMessage(msg) {
    console.log('Received message', msg);
    switch (msg.type) {
      case 'textMessage':
          this.speak(msg);
        break;
      case 'joinChannel':
        this.addClient(msg);
        // Let the new client know we're here.
        // Can we address destination directly? Is sessionId client id perhaps?
        // also change from channel to room to avoid confusion, or. use channels as is? Anyway. Good night.

        break;
      case 'leaveChannel':
        this.removeClient(msg);
        break;
      default:
        console.log('Unknown message type', msg.type);
    }
  }

  speak(msg) {
    if(msg.text && msg.lang) {
      if(!this.state.sound || (msg.senderId === CLIENT_ID)) return;
      if(window['speechSynthesis']) {
        const u = new SpeechSynthesisUtterance();
        u.text = msg.text;
        u.lang = msg.lang;
        window.speechSynthesis.speak(u);
      }
    }
  }

  addClient(msg) {
    if(msg.senderId) {
      if(this.state.clients.filter(client => client.id === msg.senderId).length > 0) return;
      this.setState({ clients: this.state.clients.concat([{ username: msg.username, id: msg.senderId, lastCheckIn: Date.now()}]) });
    }
  }

  removeClient(msg) {
    if(msg.senderId) {

      let newClients = this.state.clients.filter(client => {
        return client.id !== msg.senderId; }
      );
      console.log(newClients);
      this.setState({
        clients: this.state.clients.filter(client => {
          return client.id !== msg.senderId; }
        )
      });
    }
  }

  joinChannel(channel) {
    // Reset client list
    this.setState({ clients: [{
        id: CLIENT_ID,
        username: this.state.username,
        lastCheckIn: Date.now()
      }]
    });
    fetch(PUBLISH_URL,
    {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        cors: true,
        method: 'POST',
        body: JSON.stringify({
          type: 'joinChannel',
          senderId: CLIENT_ID,
          username: this.state.username,
          channel: channel
        })
    })
    .then(function(res){ console.log('publish success', res) })
    .catch(function(res){ console.log('publish failure', res) });
  }

  leaveChannel(channel) {
    // Reset client list
    this.setState({ clients: [{
        id: CLIENT_ID,
        username: this.state.username,
        lastCheckIn: Date.now()
      }]
    });
    fetch(PUBLISH_URL,
    {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        cors: true,
        method: 'POST',
        body: JSON.stringify({
          type: 'leaveChannel',
          senderId: CLIENT_ID,
          channel: channel
        })
    })
    .then(function(res){ console.log('publish success', res) })
    .catch(function(res){ console.log('publish failure', res) });
  }

  sendTextMessage() {
    fetch(PUBLISH_URL,
    {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        cors: true,
        method: 'POST',
        body: JSON.stringify({
          type: 'textMessage',
          senderId: CLIENT_ID,
          text: this.state.text,
          lang: this.state.lang,
          channel: this.state.channel
        })
    })
    .then(function(res){ console.log('publish success', res) })
    .catch(function(res){ console.log('publish failure', res) });
  }

  handleChannelChange(e) {
    this.unsubscribe();
    this.setState({ channel: e.target.value }, () => {
      this.subscribe();
    });
  }

  handleInputChange(e) {
    this.setState({ text: e.target.value });
  }

  handleInputKeypress(e) {
    if(e.key === 'Enter') {
      this.sendTextMessage();
      this.setState({ text: '' });
    }
  }

  handleSelectLangChange(e) {
    this.setState({ lang: e.target.value });
  }

  handleSoundCheckboxChange(e) {
    this.setState({ sound: e.target.checked });
  }
}

export default App;

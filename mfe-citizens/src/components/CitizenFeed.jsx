import React, { useState, useEffect, useRef } from 'react';
import eventBus from 'shared/eventBus';
import './CitizenFeed.css';

const PANIC_POSTS = {
  calm: [
    { text: 'La vue depuis Zone A ce soir... 🌃', delay: 4000 },
    { text: 'Café au Blue Moon, comme d\'hab ☕', delay: 4000 },
    { text: 'Les néons qui font beau ce soir 💜', delay: 5000 },
  ],
  storm: [
    { text: 'Il pleut un truc violet... ça brûle ?? 🌧️', delay: 2000 },
    { text: 'C\'est pas normal ce ciel... 😐', delay: 2000 },
    { text: 'Toxicité en hausse! ⚠️', delay: 2000 },
  ],
  blackout: [
    { text: 'COUPURE CHEZ MOI !! 😱', delay: 1000 },
    { text: 'Les ascenseurs bloqués!! 🆘', delay: 1000 },
    { text: 'TOUT EST NOIR 🔌', delay: 1000 },
  ],
  riot: [
    { text: 'ANONYMOUS EST LÀ 🔥🔥🔥', delay: 1000 },
    { text: 'CHAOS EN LIGNE!! 💀', delay: 1000 },
    { text: 'Tout s\'effondre!! 😱😱😱', delay: 1000 },
  ],
  love: [
    { text: 'C\'est magnifique 😭', delay: 3000 },
    { text: 'Je comprends pas mais je pleure ?? 🥺', delay: 3000 },
  ],
  drones: [
    { text: 'Regardez le ciel ! Les drones forment un truc ! 🛸', delay: 2000 },
    { text: 'Encore la corpo de drones qui fait sa pub... 🙄', delay: 3000 },
    { text: 'Wow l\'essaim de drones au dessus du secteur 4 📸', delay: 2000 },
  ],
  hospital_crisis: [
    { text: 'Les urgences débordent, restez chez vous ! 🚑', delay: 1000 },
    { text: 'On manque de lits au MedCenter ! 🏥🆘', delay: 1000 },
  ]
};

const AVATARS = ['👥', '🤖', '👨', '👩', '👾', '🎭', '🕵️', '💀'];

function generatePost(category = 'calm', customText = null) {
  const posts = PANIC_POSTS[category] || PANIC_POSTS.calm;
  const post = posts[Math.floor(Math.random() * posts.length)];
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  const user = `@citizen_${Math.floor(Math.random() * 9999)}`;

  return {
    id: Date.now() + Math.random(),
    avatar,
    user,
    text: customText || post.text,
    timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    delay: post.delay,
  };
}

export default function CitizenFeed() {
  const [panicLevel, setPanicLevel] = useState(5);
  const [posts, setPosts] = useState([generatePost('calm')]);
  const [isCrisis, setIsCrisis] = useState(false);
  const [trending, setTrending] = useState('#CalmNight');
  const [onlineCount, setOnlineCount] = useState(1247);
  const postIntervalRef = useRef(null);
  const unsubscribesRef = useRef([]);

  const updateCrisisState = (level) => {
    setIsCrisis(level > 40);
    setPanicLevel(level);

    const hashtags = ['#Panic', '#CrashNet', '#Blackout', '#Riot', '#SOS'];
    const newTrending = level > 40 ? hashtags[Math.floor(Math.random() * hashtags.length)] : '#CalmNight';
    setTrending(newTrending);
    
    eventBus.emit('crowd:panic', {
      level: Math.min(level, 100),
      trending: newTrending,
    });
  };

  useEffect(() => {
    const generatePostsInterval = () => {
      let category = 'calm';
      let interval = 4000;

      if (panicLevel > 80) {
        category = 'blackout';
        interval = 1000;
      } else if (panicLevel > 60) {
        category = 'riot';
        interval = 1000;
      } else if (panicLevel > 40) {
        category = 'storm';
        interval = 2000;
      }

      postIntervalRef.current = setInterval(() => {
        const newPost = generatePost(category);
        setPosts(prevPosts => [newPost, ...prevPosts].slice(0, 20));
      }, interval);
    };

    generatePostsInterval();

    return () => {
      if (postIntervalRef.current) clearInterval(postIntervalRef.current);
    };
  }, [panicLevel]);

  useEffect(() => {
    const unsubPowerOutage = eventBus.on('power:outage', ({ severity, cityPower }) => {
      setPosts(prev => [generatePost('blackout'), ...prev].slice(0, 20));
      updateCrisisState(severity === 'total' ? 87 : 60);
    });

    const unsubWeatherChange = eventBus.on('weather:change', ({ condition, toxicity }) => {
      if (toxicity > 40) setPosts(prev => [generatePost('storm'), ...prev].slice(0, 20));
      const level = Math.min(45 + (toxicity || 20), 80);
      updateCrisisState(level);
    });

    const unsubHackerCommand = eventBus.on('hacker:command', ({ command }) => {
      if (command === 'riot') {
        setPosts(prev => [generatePost('riot'), ...prev].slice(0, 20));
        updateCrisisState(95);
      } else if (command === 'love') {
        setPosts(prev => [generatePost('love'), ...prev].slice(0, 20));
        updateCrisisState(10);
      } else if (command === 'reset') {
        setPosts([generatePost('calm')]); 
        updateCrisisState(5);
      }
    });

    const unsubDrones = eventBus.on('drone:formation', ({ formation }) => {
      console.log('🛸 Drones repérés:', formation);
      setPosts(prev => [generatePost('drones', `Les drones se mettent en formation "${formation}" !`), ...prev].slice(0, 20));
    });

    const unsubHospital = eventBus.on('hospital:alert', ({ status, beds }) => {
      console.log('🏥 Alerte Hôpital:', status);
      if (status === 'critical' || (beds && beds.available < 15)) {
        setPosts(prev => [generatePost('hospital_crisis'), ...prev].slice(0, 20));
        updateCrisisState(Math.min(panicLevel + 25, 100));
      }
    });

    unsubscribesRef.current = [unsubPowerOutage, unsubWeatherChange, unsubHackerCommand, unsubDrones, unsubHospital];

    return () => {
      unsubscribesRef.current.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [panicLevel]);

  const handleSimulate = (type) => {
    switch (type) {
      case 'storm': eventBus.emit('weather:change', { condition: 'toxic_rain', toxicity: 75 }); break;
      case 'blackout': eventBus.emit('power:outage', { severity: 'critical', cityPower: 0 }); break;
      case 'riot': eventBus.emit('hacker:command', { command: 'riot' }); break;
      case 'love': eventBus.emit('hacker:command', { command: 'love' }); break;
      case 'reset': eventBus.emit('hacker:command', { command: 'reset' }); break;
      case 'hospital': eventBus.emit('hospital:alert', { status: 'critical', beds: { available: 5 } }); break;
      default: break;
    }
  };

  const panicColor = panicLevel > 60 ? '#ff003c' : panicLevel > 40 ? '#ff6b35' : '#00ff88';
  const badgeEmoji = isCrisis ? '🔴' : '🟢';
  
  const extremePanicClass = panicLevel >= 90 ? 'extreme-panic-shake' : '';

  return (
    <div className={`citizen-feed ${isCrisis ? 'crisis-mode' : ''} ${extremePanicClass}`}>
      <div className="feed-header">
        <span>{badgeEmoji} NEOCITY SOCIAL - {onlineCount} en ligne</span>
        <span style={{ fontSize: '0.7rem', color: panicColor }}>
          PANIC: {panicLevel}% | {trending}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', order: '-1' }}>
        <button className="simulate-btn" onClick={() => handleSimulate('storm')}>WEATHER</button>
        <button className="simulate-btn" onClick={() => handleSimulate('blackout')}>BLACKOUT</button>
        <button className="simulate-btn" onClick={() => handleSimulate('riot')}>RIOT</button>
        <button className="simulate-btn" onClick={() => handleSimulate('love')}>LOVE</button>
        <button className="simulate-btn" onClick={() => handleSimulate('hospital')}>HOSPITAL</button>
        <button className="simulate-btn" onClick={() => handleSimulate('reset')}>RESET</button>
      </div>

      <div className="panic-bar">
        <div className="panic-fill" style={{ width: `${panicLevel}%`, backgroundColor: panicColor, transition: 'width 0.5s ease-in-out, background-color 0.5s ease' }} />
      </div>

      <div className="feed-posts">
        {posts.map(post => (
          <div key={post.id} className="post new-post-animation">
            <div className="post-avatar">{post.avatar}</div>
            <div className="post-content">
              <div style={{ display: 'flex', gap: '6px' }}>
                <span className="post-user">{post.user}</span>
                <span className="post-ts">{post.timestamp}</span>
              </div>
              <div className="post-text">{post.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '0.65rem', color: '#4a5568', marginTop: '10px', textAlign: 'center' }}>
        📡 listen: power, weather, hacker, drones, hospital | emit: crowd:panic
      </div>
    </div>
  );
}
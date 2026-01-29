import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Setup Pusher globally if needed
if (typeof window !== 'undefined') {
    (window as any).Pusher = Pusher;
}

const echo = typeof window !== 'undefined'
    ? new Echo({
        broadcaster: 'reverb',
        key: process.env.NEXT_PUBLIC_REVERB_APP_KEY || 'jryvxcmr9wiz46awfagn',
        wsHost: process.env.NEXT_PUBLIC_REVERB_HOST || 'localhost',
        wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT) || 8080,
        wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT) || 8080,
        forceTLS: (process.env.NEXT_PUBLIC_REVERB_SCHEME || 'http') === 'https',
        enabledTransports: ['ws', 'wss'],
        // Set authorizer for private/presence channels
        authorizer: (channel: any, options: any) => {
            return {
                authorize: (socketId: string, callback: Function) => {
                    // Use common axios instance for CSRF and session cookies
                    import('./axios').then((axios) => {
                        axios.default.post('/api/broadcasting/auth', {
                            socket_id: socketId,
                            channel_name: channel.name
                        })
                            .then(response => {
                                callback(false, response.data);
                            })
                            .catch(error => {
                                callback(true, error);
                            });
                    });
                }
            };
        },
    })
    : null;

export default echo;

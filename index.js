// index.js
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Listen for messages
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Command to show help
    if (message.content === '!help') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099FF) // Set embed color
            .setTitle('Available Commands')
            .setDescription('Here are the commands you can use:')
            .addFields(
                { name: '!recommend <author>', value: 'Get a book recommendation from a specific author.' },
                { name: '!recommend <genre>', value: 'Get a book recommendation from a specific genre.'},
                { name: '!search <book title>', value: 'Search for a book by its title.' },
                { name: '!ping', value: 'Check the bot\'s response time.' },
                { name: '!help', value: 'Show this help message.' }
            );

        message.channel.send({ embeds: [helpEmbed] });
        return; // Exit after sending help
    }

    // Function to search for books with their name
    if (message.content.startsWith('!search')) {
        const args = message.content.split(' ').slice(1);
        const bookTitle = args.join(' ');

        if (!bookTitle) {
            return message.channel.send('Please provide a book title to search for.');
        }

        const apiUrl = `${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(bookTitle)}&key=${process.env.GOOGLE_API_KEY}`; // Use environment variable for the API key

        try {
            const response = await axios.get(apiUrl);
            const books = response.data.items;

            if (!books || books.length === 0) {
                return message.channel.send('No books found for that title.');
            }

            const book = books[0]; // Get the first book result
            const title = book.volumeInfo.title;
            const authors = book.volumeInfo.authors.join(', ') || 'Unknown Author';
            const description = book.volumeInfo.description || 'No description available.';
            const thumbnail = book.volumeInfo.imageLinks?.thumbnail || 'No image available.';

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(title)
                .setURL(book.volumeInfo.infoLink)
                .setAuthor({ name: authors })
                .setDescription(description)
                .setThumbnail(thumbnail)
                .setFooter({ text: 'Powered by Google Books API' });

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching book data:', error);
            message.channel.send('There was an error fetching book data. Please try again later.');
        }
    }

    // Command to recommend a book
    if (message.content.startsWith('!recommend')) {
        const author = message.content.split(' ').slice(1).join(' ');

        if (!author) {
            return message.channel.send('Please provide an author name for recommendations.');
        }

        try {
            const books = await getBookRecommendation(author);
            if (books.length > 0) {
                const randomBook = books[Math.floor(Math.random() * books.length)];
                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle(randomBook.volumeInfo.title)
                    .setAuthor({ name: randomBook.volumeInfo.authors.join(', ') })
                    .setDescription(randomBook.volumeInfo.description || 'No description available.')
                    .addFields(
                        { name: 'Plot', value: randomBook.volumeInfo.description ? randomBook.volumeInfo.description.split('.')[0] + '.' : 'No plot description available.' }
                    )
                    .setURL(randomBook.volumeInfo.infoLink)
                    .setThumbnail(randomBook.volumeInfo.imageLinks?.thumbnail || '')
                    .setFooter({ text: 'Powered by Google Books API' });

                message.channel.send({ embeds: [embed] });
            } else {
                message.channel.send('No recommendations found for that author.');
            }
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            message.channel.send('There was an error fetching the recommendations. Please try again later.');
        }
    }

    // Command to check the bot's response time
    if (message.content === '!ping') {
        const sentMessage = await message.channel.send('Pinging...');
        const responseTime = sentMessage.createdTimestamp - message.createdTimestamp;
        sentMessage.edit(`Pong! Response time: ${responseTime}ms`);
    }
});

// Function to get book recommendations from Google Books API
async function getBookRecommendation(author) {
    const response = await axios.get(GOOGLE_BOOKS_API_URL, {
        params: {
            q: `inauthor:${author}`,
            key: process.env.GOOGLE_API_KEY, // Use environment variable for API Key
            maxResults: 10 // Number of results to fetch
        }
    });
    return response.data.items || [];
}

// Log in to Discord with your bot's token
client.login(process.env.DISCORD_TOKEN);

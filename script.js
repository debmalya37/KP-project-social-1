// script.js

document.getElementById('urlForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const urlInput = document.getElementById('urlInput').value;
    const resultDiv = document.getElementById('result');
    
    // Clear previous result
    resultDiv.innerHTML = '';

    if (urlInput.includes('facebook.com')) {
        // Handle Facebook URL
        const facebookInfo = await handleFacebookURL(urlInput);
        resultDiv.innerHTML = facebookInfo ? formatFacebookResult(facebookInfo) : 'Could not fetch Facebook info';
    } else if (urlInput.includes('youtube.com') || urlInput.includes('youtu.be')) {
        // Handle YouTube URL
        const youtubeInfo = await handleYouTubeURL(urlInput);
        resultDiv.innerHTML = youtubeInfo ? formatYouTubeResult(youtubeInfo) : 'Could not fetch YouTube info';
    } else {
        resultDiv.innerHTML = 'Please enter a valid Facebook or YouTube URL.';
    }
});
// const fbAccessToken = 'EAASGC3WvqkYBOxf4WS3oJxrEeqO0pxBRVipdlrcPUyQy4ZCw0Bwcr7dqomqdPW1VZCo147PZCvDZCSja8vFv6BYhGRjc4Pkqh0tuczi7iumZB8Np8KTi6LqaCn7p94hdZCXVwlgZBOJZAM0Iup2dATuGy6pq2dbgI3R4wQKfEqbTyBTMcFwazmYIfEavl2SB2JMBakiQKZCmCYcZBA26vuAs5puZAQPZBYN9mt1eDa9HzPssokUZD'; 

// Function to handle Facebook URL parsing and API call
async function handleFacebookURL(url) {
    const userInfo = extractFacebookInfo(url);
    if (userInfo) {
        const { user_identifier } = userInfo;
        const fbAccessToken = 'EAASGC3WvqkYBOxf4WS3oJxrEeqO0pxBRVipdlrcPUyQy4ZCw0Bwcr7dqomqdPW1VZCo147PZCvDZCSja8vFv6BYhGRjc4Pkqh0tuczi7iumZB8Np8KTi6LqaCn7p94hdZCXVwlgZBOJZAM0Iup2dATuGy6pq2dbgI3R4wQKfEqbTyBTMcFwazmYIfEavl2SB2JMBakiQKZCmCYcZBA26vuAs5puZAQPZBYN9mt1eDa9HzPssokUZD'; // Replace with your User Access Token

        const apiUrl = `https://graph.facebook.com/${user_identifier}?fields=name&access_token=${fbAccessToken}`;
        
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            if (data.error) {
                console.error('Error from Facebook API:', data.error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error fetching Facebook data:', error);
            return null;
        }
    }
    return null;
}



// Function to handle YouTube URL parsing and API call
async function handleYouTubeURL(url) {
    const videoInfo = extractYouTubeInfo(url);
    if (videoInfo) {
        const { video_id } = videoInfo;
        const youtubeApiKey = 'AIzaSyAXFD_6W3-puGg5k_sAiaO8pzWHYBZC8vY'; // Get it from Google Cloud Console
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${video_id}&key=${youtubeApiKey}`;
        
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            return data.items[0].snippet;
        } catch (error) {
            console.error('Error fetching YouTube data:', error);
            return null;
        }
    }
    return null;
}

// Extract Facebook user ID or username from URL
function extractFacebookInfo(url) {
    const urlParts = new URL(url);
    const pathParts = urlParts.pathname.split('/');
    
    if (pathParts.includes('posts')) {
        return {
            user_identifier: pathParts[1],  // Username or user ID
            post_id: pathParts[3]
        };
    }
    return null;
}

// Extract YouTube video ID from URL
function extractYouTubeInfo(url) {
    const urlParts = new URL(url);
    const queryParams = new URLSearchParams(urlParts.search);
    const videoId = queryParams.get('v') || urlParts.pathname.split('/').pop();
    
    if (videoId) {
        return { video_id: videoId };
    }
    return null;
}

// Format the result to display Facebook info
function formatFacebookResult(data) {
    return `
        <h3>Facebook User Info</h3>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>ID:</strong> ${data.id}</p>
    `;
}

// Format the result to display YouTube info
function formatYouTubeResult(data) {
    return `
        <h3>YouTube Video Info</h3>
        <p><strong>Title:</strong> ${data.title}</p>
        <p><strong>Channel:</strong> ${data.channelTitle}</p>
    `;
}

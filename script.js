document.getElementById('urlForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const urlInput = document.getElementById('urlInput').value.trim();
    const urls = urlInput.split('\n').map(url => url.trim()).filter(url => url.length > 0);
    const resultTableBody = document.querySelector('#resultTable tbody');
    const repeatedTableBody = document.querySelector('#repeatedTable tbody');
    resultTableBody.innerHTML = ''; // Clear previous results
    repeatedTableBody.innerHTML = ''; // Clear previous repeated results

    const results = [];
    const nameCount = {};
    const repeatedResults = []; // Store repeated names

    for (const url of urls) {
        let rowData = null;
        if (url.includes('facebook.com')) {
            // Handle Facebook URL
            rowData = await handleFacebookURL(url);
            if (rowData) rowData.platform = 'Facebook';
        } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
            // Handle YouTube URL
            rowData = await handleYouTubeURL(url);
            if (rowData) rowData.platform = 'YouTube';
        } else if (url.includes('twitter.com') || url.includes('x.com')) {
            // Handle Twitter URL
            rowData = handleTwitterURL(url);
            if (rowData) rowData.platform = 'Twitter';
        }

        if (rowData) {
            results.push(rowData);

            // Count occurrences of names/titles
            const nameKey = rowData.title || rowData.name;
            if (!nameCount[nameKey]) {
                nameCount[nameKey] = 1;
            } else {
                nameCount[nameKey]++;
            }

            // Add to repeated results if occurrences >= 10
            if (nameCount[nameKey] >= 10 && !repeatedResults.includes(nameKey)) {
                repeatedResults.push(nameKey);
                const repeatedRow = `<tr><td>${nameKey}</td></tr>`;
                repeatedTableBody.insertAdjacentHTML('beforeend', repeatedRow);
            }

            // Apply red class if occurrences >= 10
            const nameClass = nameCount[nameKey] >= 10 ? 'red' : '';
            const row = `<tr class="${nameClass}">
                <td>${rowData.platform}</td>
                <td>${rowData.title || rowData.name}</td>
                <td>${rowData.channel || rowData.userId}</td>
            </tr>`;
            resultTableBody.insertAdjacentHTML('beforeend', row);
        }
    }

    // If there are results, show the download button
    if (results.length > 0) {
        document.getElementById('downloadBtn').style.display = 'inline-block';
        document.getElementById('downloadBtn').onclick = () => downloadExcel(results, repeatedResults, nameCount);
    }

    // Show repeated names table only if there are repeated names
    if (repeatedResults.length > 0) {
        document.getElementById('repeatedSection').style.display = 'block';
    } else {
        document.getElementById('repeatedSection').style.display = 'none';
    }
});

// Function to handle Facebook URL parsing and API call
async function handleFacebookURL(url) {
    const userInfo = extractFacebookInfo(url);
    if (userInfo) {
        const { user_identifier } = userInfo;
        const fbAccessToken = 'FACEBOOK_ACCESS_TOKEN'; 
        const apiUrl = `https://graph.facebook.com/${user_identifier}?fields=name&access_token=${fbAccessToken}`;
        
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            if (data.error) return null;
            return { name: data.name, userId: data.id };
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
        const youtubeApiKey = 'AIzaSyAXFD_6W3-puGg5k_sAiaO8pzWHYBZC8vY'; 
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${video_id}&key=${youtubeApiKey}`;
        
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            return { title: data.items[0].snippet.title, channel: data.items[0].snippet.channelTitle };
        } catch (error) {
            console.error('Error fetching YouTube data:', error);
            return null;
        }
    }
    return null;
}

// Function to handle Twitter URL parsing
function handleTwitterURL(url) {
    const twitterInfo = extractTwitterInfo(url);
    if (twitterInfo) {
        return { name: twitterInfo.username, userId: twitterInfo.tweet_id };
    }
    return null;
}

// Extract Facebook user ID or username from URL
function extractFacebookInfo(url) {
    const urlParts = new URL(url);
    const pathParts = urlParts.pathname.split('/');
    if (pathParts.includes('posts')) {
        return { user_identifier: pathParts[1] };
    }
    return null;
}

// Extract YouTube video ID from URL
function extractYouTubeInfo(url) {
    const urlParts = new URL(url);
    const queryParams = new URLSearchParams(urlParts.search);
    const videoId = queryParams.get('v') || urlParts.pathname.split('/').pop();
    return { video_id: videoId };
}

// Extract Twitter username and tweet ID from URL
function extractTwitterInfo(url) {
    const urlParts = new URL(url);
    const pathParts = urlParts.pathname.split('/');
    if (pathParts.length > 1) {
        return { username: pathParts[1], tweet_id: pathParts[3] };
    }
    return null;
}

// Download data as Excel with red highlighting for repeated names
function downloadExcel(data, repeatedData, nameCount) {
    const workbook = XLSX.utils.book_new();

    // Create the data with additional styling for colors
    const formattedData = data.map((row, index) => {
        const nameKey = row.title || row.name;
        const isRed = nameCount[nameKey] >= 10;
        const platformCell = { v: row.platform };
        const titleCell = { v: row.title || row.name, s: { fill: { fgColor: { rgb: "DCEFFF" } } } }; // Light blue
        const channelCell = {
            v: row.channel || row.userId,
            s: { fill: { fgColor: { rgb: "FFD966" } } }, // Orangish-yellow background
        };

        if (isRed) {
            // If the name/channel is repeated >= 10 times, make the title red
            titleCell.s.font = { color: { rgb: "FF0000" } }; // Red text
        }

        return [platformCell, titleCell, channelCell];
    });

    // Create worksheet with styled data
    const worksheet = XLSX.utils.aoa_to_sheet([["Platform", "Title/Name", "Channel/User ID"], ...formattedData]);

    // Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Main Results');

    // Create a sheet for repeated names
    const repeatedSheetData = repeatedData.map((name) => [{ v: name, s: { font: { color: { rgb: "FF0000" } } } }]); // Red text for repeated names
    const repeatedSheet = XLSX.utils.aoa_to_sheet([["Channel/User ID"], ...repeatedSheetData]);
    XLSX.utils.book_append_sheet(workbook, repeatedSheet, 'Repeated Names');

    // Write the Excel file with applied styles
    XLSX.writeFile(workbook, 'url_info.xlsx');
}

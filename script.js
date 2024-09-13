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
    const channelCount = {}; // To count occurrences in Channel/User ID
    const repeatedResults = [];

    for (const url of urls) {
        let rowData = null;
        if (url.includes('facebook.com')) {
            rowData = await handleFacebookURL(url);
            if (rowData) rowData.platform = 'Facebook';
        } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
            rowData = await handleYouTubeURL(url);
            if (rowData) rowData.platform = 'YouTube';
        } else if (url.includes('twitter.com') || url.includes('x.com')) {
            rowData = handleTwitterURL(url);
            if (rowData) rowData.platform = 'Twitter';
        }

        if (rowData) {
            results.push(rowData);

            // Count occurrences of names/titles
            const nameKey = rowData.title || rowData.name || rowData.channel || rowData.userId;
            if (!nameCount[nameKey]) {
                nameCount[nameKey] = 1;
            } else {
                nameCount[nameKey]++;
            }

            // Count occurrences in Channel/User ID
            const channelKey = rowData.channel || rowData.userId;
            if (!channelCount[channelKey]) {
                channelCount[channelKey] = 1;
            } else {
                channelCount[channelKey]++;
            }

            // Add to repeated results if occurrences >= 5 (for both Title/Name and Channel/User ID)
            if ((nameCount[nameKey] >= 5 || channelCount[channelKey] >= 5) && !repeatedResults.includes(nameKey)) {
                repeatedResults.push(nameKey);
                const repeatedRow = `<tr><td>${nameKey} (${nameCount[nameKey]})</td></tr>`;
                repeatedTableBody.insertAdjacentHTML('beforeend', repeatedRow);
            }

            // Modify the name and channel to include the count if occurrences > 1
            const nameWithCount = nameCount[nameKey] > 1 ? `${nameKey} (${nameCount[nameKey]})` : nameKey;
            const channelWithCount = channelCount[channelKey] > 1 ? `${channelKey} (${channelCount[channelKey]})` : channelKey;

            // Apply bold and red class if occurrences >= 5 for either Title/Name or Channel/User ID
            const isRepeated = nameCount[nameKey] >= 5 || channelCount[channelKey] >= 5;
            const nameClass = isRepeated ? 'bold red' : '';

            const row = `<tr>
                <td>${rowData.platform}</td>
                <td class="${nameClass}">${nameWithCount}</td>
                <td class="${nameClass}">${channelWithCount}</td>
            </tr>`;
            resultTableBody.insertAdjacentHTML('beforeend', row);
        }
    }

    // If there are results, show the download button
    if (results.length > 0) {
        document.getElementById('downloadBtn').style.display = 'inline-block';
        document.getElementById('downloadBtn').onclick = () => downloadExcel(results, repeatedResults, nameCount, channelCount);
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

// Download data as Excel with bold and red highlighting for repeated names
// Function to download the Excel file with counts in name fields and channel fields
async function downloadExcel(data, repeatedData, nameCount, channelCount) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Main Results');

    // Set the header row with styling
    worksheet.columns = [
        { header: 'Platform', key: 'platform', width: 15 },
        { header: 'Title/Name', key: 'title', width: 30 },
        { header: 'Channel/User ID', key: 'channel', width: 30 }
    ];

    // Add rows with correct cell styling and counts
    data.forEach(row => {
        const nameKey = row.title || row.name || row.channel || row.userId;
        const channelKey = row.channel || row.userId;
        const isRepeated = nameCount[nameKey] >= 5 || channelCount[channelKey] >= 5;

        // Modify the name and channel to include the count if occurrences > 1
        const nameWithCount = nameCount[nameKey] > 1 ? `${nameKey} (${nameCount[nameKey]})` : nameKey;
        const channelWithCount = channelCount[channelKey] > 1 ? `${channelKey} (${channelCount[channelKey]})` : channelKey;

        // Insert row data
        const insertedRow = worksheet.addRow({
            platform: row.platform,
            title: nameWithCount,
            channel: channelWithCount
        });

        // Apply styles
        insertedRow.getCell('title').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'DCEFFF' } // Light blue background for 'Title/Name'
        };

        insertedRow.getCell('channel').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD966' } // Orangish-yellow background for 'Channel/User ID'
        };

        // Apply bold and red font if name is repeated 5 or more times
        if (isRepeated) {
            insertedRow.getCell('title').font = { color: { argb: 'FF0000' }, bold: true }; // Red and bold text for repeated names
            insertedRow.getCell('channel').font = { color: { argb: 'FF0000' }, bold: true }; // Red and bold text for repeated Channel/User ID
        }
    });

    // Add a new worksheet for repeated names
    const repeatedSheet = workbook.addWorksheet('Repeated Names');
    repeatedSheet.columns = [{ header: 'Channel/User ID', key: 'channel', width: 30 }];
    repeatedData.forEach(name => {
        const repeatedRow = repeatedSheet.addRow({ channel: `${name} (${nameCount[name]})` });
        repeatedRow.getCell('channel').font = { color: { argb: 'FF0000' }, bold: true }; // Red and bold text for repeated names
    });

    // Export the Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'url_info.xlsx';
    link.click();
}
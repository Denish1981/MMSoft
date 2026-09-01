import JSZip from 'jszip';
import type { DetailedEventParticipantExportItem } from '../types/participants';
import { formatUTCDate } from './formatting';

/**
 * Standard CSV export for generic tabular data
 */
export const exportToCsv = (data: Record<string, any>[], filename: string) => {
    if (!data || data.length === 0) {
        alert("No data to export.");
        return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','), // header row
        ...data.map(row => 
            headers.map(header => {
                let cell = row[header] === null || row[header] === undefined ? '' : String(row[header]);
                // Escape quotes and wrap in quotes if contains commas, quotes or newlines
                if (cell.includes('"') || cell.includes(',') || cell.includes('\n') || cell.includes('\r')) {
                    cell = `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(',')
        )
    ];

    const csvString = csvRows.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Helper to extract and format Group Members from formData
 */
export const formatGroupMembers = (formData: Record<string, any> = {}): string => {
    const rawMembers = formData.group_members || 
                       formData.groupMembers || 
                       formData.members || 
                       formData.team_members || 
                       formData.teamMembers || 
                       formData.group_roster;

    if (!rawMembers) {
        // Check for plain string fields (e.g. member list in textarea)
        if (typeof formData.group_member_names === 'string' && formData.group_member_names.trim()) {
            return formData.group_member_names.trim().replace(/[\r\n]+/g, ', ');
        }
        return 'None';
    }

    if (Array.isArray(rawMembers)) {
        if (rawMembers.length === 0) return 'None';
        const formatted = rawMembers
            .map(m => {
                if (!m) return '';
                if (typeof m === 'string') return m.trim();
                const name = (m.name || m.fullName || m.memberName || '').trim();
                const phone = (m.phone || m.phoneNumber || m.mobileNumber || m.contactNumber || '').trim();
                if (!name) return '';
                return phone ? `${name} (${phone})` : name;
            })
            .filter(Boolean);

        return formatted.length > 0 ? formatted.join(', ') : 'None';
    }

    if (typeof rawMembers === 'string' && rawMembers.trim()) {
        return rawMembers.trim().replace(/[\r\n]+/g, ', ');
    }

    return 'None';
};

/**
 * Helper to extract Song Track Name and Track Length from formData
 */
export const extractSongTrackDetails = (formData: Record<string, any> = {}): { trackName: string; trackLength: string } => {
    let trackName = 'N/A';
    let trackLength = 'N/A';

    // 1. Search for audio / track file names
    const explicitFileName = formData.audio_filename || 
                             formData.song_filename || 
                             formData.track_filename || 
                             formData.songTrack_filename || 
                             formData.audioTrack_filename ||
                             formData.music_filename ||
                             formData.performance_track_filename;

    const explicitTrackName = formData.song_name || 
                              formData.songName || 
                              formData.track_name || 
                              formData.trackName || 
                              formData.audio_name || 
                              formData.audioName || 
                              formData.song_title || 
                              formData.track_title || 
                              formData.title;

    if (explicitFileName && String(explicitFileName).trim()) {
        trackName = String(explicitFileName).trim();
    } else if (explicitTrackName && String(explicitTrackName).trim()) {
        trackName = String(explicitTrackName).trim();
    } else {
        // Search dynamic keys in formData
        for (const [key, value] of Object.entries(formData)) {
            if (key.endsWith('_filename') && typeof value === 'string' && value.trim()) {
                trackName = value.trim();
                break;
            }
            if ((key.toLowerCase().includes('audio') || key.toLowerCase().includes('song') || key.toLowerCase().includes('track')) && 
                typeof value === 'string' && value.trim()) {
                if (value.startsWith('data:audio') || value.startsWith('/api/event-registrations/') || value.includes('/files/') || value.includes('/audio')) {
                    trackName = 'Uploaded Audio Track';
                    break;
                } else if (/\.(mp3|wav|aac|m4a|ogg|wma|flac)$/i.test(value)) {
                    trackName = value.trim();
                    break;
                }
            }
        }
    }

    // 2. Search for audio / track length / duration
    const explicitDuration = formData.audio_duration || 
                            formData.song_duration || 
                            formData.track_duration || 
                            formData.duration || 
                            formData.songDuration || 
                            formData.trackDuration ||
                            formData.audio_length || 
                            formData.song_length || 
                            formData.songLength || 
                            formData.track_length || 
                            formData.trackLength;

    const explicitFileSize = formData.audio_filesize || 
                            formData.song_filesize || 
                            formData.track_filesize || 
                            formData.filesize || 
                            formData.audioFileSize;

    if (explicitDuration !== undefined && explicitDuration !== null && String(explicitDuration).trim() !== '') {
        const rawDur = String(explicitDuration).trim();
        // If it's pure number in seconds, convert to M:SS
        const numDur = Number(rawDur);
        if (!isNaN(numDur) && numDur > 0) {
            const mins = Math.floor(numDur / 60);
            const secs = Math.floor(numDur % 60);
            trackLength = `${mins}:${secs.toString().padStart(2, '0')}`;
        } else {
            trackLength = rawDur;
        }
    } else {
        // Look for dynamic _duration or _length keys
        for (const [key, value] of Object.entries(formData)) {
            if ((key.endsWith('_duration') || key.endsWith('_length')) && value !== undefined && value !== null && String(value).trim()) {
                const numVal = Number(value);
                if (!isNaN(numVal) && numVal > 0) {
                    const mins = Math.floor(numVal / 60);
                    const secs = Math.floor(numVal % 60);
                    trackLength = `${mins}:${secs.toString().padStart(2, '0')}`;
                } else {
                    trackLength = String(value).trim();
                }
                break;
            }
        }

        // If length/duration not found but filesize is available and track exists
        if (trackLength === 'N/A' && explicitFileSize && trackName !== 'N/A') {
            trackLength = `Size: ${explicitFileSize}`;
        }
    }

    return { trackName, trackLength };
};

/**
 * Escape a cell value for CSV (RFC 4180)
 */
const escapeCsvCell = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

/**
 * Export participant registrations grouped by date into a ZIP file with multiple CSV files.
 * - Each CSV contains data of participants and events on a single date.
 * - If a date has multiple events, all events on that date are in that CSV.
 * - Group members formatted with names separated by comma.
 * - Song track name and length included if submitted.
 * - Rows within each CSV sorted by registered date on (submittedAt ASC) so earliest registered appears first.
 */
export const exportParticipantsZipByDate = async (
    registrations: DetailedEventParticipantExportItem[],
    zipBaseName = 'participants_by_date'
): Promise<void> => {
    if (!registrations || registrations.length === 0) {
        alert("No participant data to export.");
        return;
    }

    const zip = new JSZip();

    // Group registrations by event date (YYYY-MM-DD)
    const groupedByDate: Record<string, DetailedEventParticipantExportItem[]> = {};

    registrations.forEach(item => {
        let dateKey = 'undated';
        if (item.eventDate) {
            // Normalize to YYYY-MM-DD
            dateKey = item.eventDate.includes('T') 
                ? item.eventDate.split('T')[0] 
                : item.eventDate.trim();
        }

        if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(item);
    });

    const csvHeaders = [
        'Event Name',
        'Event Date',
        'Event Time',
        'Venue',
        'Registered Date On',
        'Participant Name',
        'Phone Number',
        'Email',
        'Tower Number',
        'Flat Number',
        'Registration Type',
        'Group / Team Name',
        'Group Members',
        'Song Track Name',
        'Song Track Length',
        'Festival Name'
    ];

    // Build a CSV for each date group
    Object.keys(groupedByDate).sort().forEach(dateKey => {
        const items = groupedByDate[dateKey];

        // Sort on the basis of registered date on (submittedAt ascending)
        items.sort((a, b) => {
            const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
            const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
            return timeA - timeB;
        });

        const rows: string[][] = [csvHeaders];

        items.forEach(item => {
            const formData = item.formData || {};
            const groupMembersStr = formatGroupMembers(formData);
            const { trackName, trackLength } = extractSongTrackDetails(formData);

            const eventTimeStr = item.startTime 
                ? (item.endTime ? `${item.startTime.substring(0, 5)} - ${item.endTime.substring(0, 5)}` : item.startTime.substring(0, 5))
                : 'N/A';

            const formattedEventDate = item.eventDate 
                ? formatUTCDate(item.eventDate) 
                : 'N/A';

            const formattedRegisteredOn = item.submittedAt 
                ? formatUTCDate(item.submittedAt, { dateStyle: 'medium', timeStyle: 'short' })
                : 'N/A';

            const regType = item.isGroupEvent 
                ? 'Group Event' 
                : (groupMembersStr !== 'None' ? 'Group' : 'Individual');

            const groupName = formData.group_name || 
                              formData.groupName || 
                              formData.team_name || 
                              formData.teamName || 
                              (item.isGroupEvent ? 'Group' : 'N/A');

            const phone = item.phoneNumber || 
                          formData.phone_number || 
                          formData.phoneNumber || 
                          formData.mobile_number || 
                          formData.contact_number || 
                          formData.phone || 
                          'N/A';

            const email = item.email || formData.email || 'N/A';
            const tower = item.towerNumber || formData.tower_number || formData.towerNumber || formData.tower || 'N/A';
            const flat = item.flatNumber || formData.flat_number || formData.flatNumber || formData.flat || 'N/A';

            rows.push([
                item.eventName || 'N/A',
                formattedEventDate,
                eventTimeStr,
                item.venue || 'N/A',
                formattedRegisteredOn,
                item.name || 'N/A',
                phone,
                email,
                tower,
                flat,
                regType,
                groupName,
                groupMembersStr,
                trackName,
                trackLength,
                item.festivalName || 'N/A'
            ]);
        });

        const csvContent = rows
            .map(row => row.map(escapeCsvCell).join(','))
            .join('\r\n');

        const csvFileName = `participants_${dateKey}.csv`;
        zip.file(csvFileName, csvContent);
    });

    // Generate ZIP archive blob
    const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });

    const currentDateStr = new Date().toISOString().split('T')[0];
    const finalZipName = `${zipBaseName}_${currentDateStr}.zip`;

    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', finalZipName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

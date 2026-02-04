import { db } from '../lib/db';
import { groupMembers, groupMessages, communityGroups } from '../lib/db/schema';

async function main() {
  console.log('Starting deletion of all groups and related data...');
  try {
    // Delete in order to respect foreign key constraints
    const membersDeleted = await db.delete(groupMembers);
    console.log('Deleted group members');
    
    const messagesDeleted = await db.delete(groupMessages);
    console.log('Deleted group messages');
    
    const groupsDeleted = await db.delete(communityGroups);
    console.log('Deleted all community groups');
    
    console.log('Successfully cleared all group data.');
  } catch (error) {
    console.error('Error deleting group data:', error);
    process.exit(1);
  }
}

main();

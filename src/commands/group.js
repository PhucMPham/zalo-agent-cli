/**
 * Group commands — list, create, info, members, add/remove-member, rename, avatar,
 * admin, owner, block/unblock, settings, leave, join.
 */

import { resolve } from "path";
import { getApi } from "../core/zalo-client.js";
import { success, error, info, output } from "../utils/output.js";

export function registerGroupCommands(program) {
    const group = program.command("group").description("Manage groups");

    group
        .command("list")
        .description("List all groups")
        .action(async () => {
            try {
                const result = await getApi().getAllGroups();
                output(result, program.opts().json);
            } catch (e) {
                error(e.message);
            }
        });

    group
        .command("create <name> <memberIds...>")
        .description("Create a new group")
        .action(async (name, memberIds) => {
            try {
                const result = await getApi().createGroup({ members: memberIds, name });
                output(result, program.opts().json, () => success(`Group "${name}" created`));
            } catch (e) {
                error(e.message);
            }
        });

    group
        .command("info <groupId>")
        .description("Show group details")
        .action(async (groupId) => {
            try {
                const result = await getApi().getGroupInfo(groupId);
                output(result, program.opts().json);
            } catch (e) {
                error(e.message);
            }
        });

    group
        .command("history <groupId>")
        .description("Get group chat history (recent messages)")
        .option("-n, --count <n>", "Number of messages to fetch", "20")
        .action(async (groupId, opts) => {
            try {
                const result = await getApi().getGroupChatHistory(groupId, Number(opts.count));
                const msgs = result?.groupMsgs || [];

                // Normalize messages into clean, storage-friendly JSON
                const normalized = msgs.map((m) => {
                    const d = m.data || m;
                    const content = typeof d.content === "string" ? d.content : d.content;
                    return {
                        msgId: d.msgId,
                        cliMsgId: d.cliMsgId,
                        fromUid: d.uidFrom,
                        groupId: d.idTo,
                        msgType: d.msgType,
                        content: typeof content === "string" ? content : content,
                        timestamp: Number(d.ts),
                        isoTime: new Date(Number(d.ts)).toISOString(),
                        isSelf: m.isSelf ?? false,
                        ...(d.mentions && { mentions: d.mentions }),
                        ...(d.quote && {
                            quote: {
                                ownerId: d.quote.ownerId,
                                msg: d.quote.msg,
                                msgId: d.quote.globalMsgId,
                            },
                        }),
                    };
                });

                const payload = {
                    groupId,
                    count: normalized.length,
                    hasMore: result?.more === 1,
                    messages: normalized,
                };

                output(payload, program.opts().json, () => {
                    info(`${normalized.length} message(s) in group ${groupId}`);
                    if (result?.more === 1) info("(more messages available)");
                    console.log();
                    for (const m of normalized) {
                        const time = new Date(m.timestamp).toLocaleTimeString();
                        const dir = m.isSelf ? "→" : "←";
                        const text =
                            typeof m.content === "string" ? m.content.slice(0, 80) : `[${m.msgType || "attachment"}]`;
                        console.log(`  ${time} ${dir} ${m.fromUid}: ${text}`);
                    }
                });
            } catch (e) {
                error(`Get history failed: ${e.message}`);
            }
        });

    group
        .command("members <groupId>")
        .description("List group members")
        .action(async (groupId) => {
            try {
                const result = await getApi().getGroupInfo(groupId);
                const members = result?.gridInfoMap?.[groupId]?.memberIds || {};
                output(members, program.opts().json, () => {
                    const ids = Object.keys(members);
                    info(`${ids.length} members`);
                    ids.forEach((id) => console.log(`  ${id}`));
                });
            } catch (e) {
                error(e.message);
            }
        });

    group
        .command("add-member <groupId> <userIds...>")
        .description("Add members to a group")
        .action(async (groupId, userIds) => {
            try {
                const result = await getApi().addUserToGroup(userIds, groupId);
                output(result, program.opts().json, () => success("Member(s) added"));
            } catch (e) {
                error(e.message);
            }
        });

    group
        .command("remove-member <groupId> <userIds...>")
        .description("Remove members from a group")
        .action(async (groupId, userIds) => {
            try {
                const result = await getApi().removeUserFromGroup(userIds, groupId);
                output(result, program.opts().json, () => success("Member(s) removed"));
            } catch (e) {
                error(e.message);
            }
        });

    group
        .command("rename <groupId> <name>")
        .description("Rename a group")
        .action(async (groupId, name) => {
            try {
                const result = await getApi().changeGroupName(groupId, name);
                output(result, program.opts().json, () => success(`Group renamed to "${name}"`));
            } catch (e) {
                error(e.message);
            }
        });

    group
        .command("avatar <groupId> <imagePath>")
        .description("Change group avatar")
        .action(async (groupId, imagePath) => {
            try {
                const result = await getApi().changeGroupAvatar(resolve(imagePath), groupId);
                output(result, program.opts().json, () => success("Group avatar changed"));
            } catch (e) {
                error(`Change avatar failed: ${e.message}`);
            }
        });

    group
        .command("add-admin <groupId> <userIds...>")
        .description("Promote members to group admin (deputy)")
        .action(async (groupId, userIds) => {
            try {
                const result = await getApi().addGroupDeputy(userIds, groupId);
                output(result, program.opts().json, () => success("Admin(s) added"));
            } catch (e) {
                error(`Add admin failed: ${e.message}`);
            }
        });

    group
        .command("remove-admin <groupId> <userIds...>")
        .description("Demote admins back to regular members")
        .action(async (groupId, userIds) => {
            try {
                const result = await getApi().removeGroupDeputy(userIds, groupId);
                output(result, program.opts().json, () => success("Admin(s) removed"));
            } catch (e) {
                error(`Remove admin failed: ${e.message}`);
            }
        });

    group
        .command("transfer-owner <groupId> <userId>")
        .description("Transfer group ownership to another member")
        .action(async (groupId, userId) => {
            try {
                const result = await getApi().changeGroupOwner(userId, groupId);
                output(result, program.opts().json, () => success(`Ownership transferred to ${userId}`));
            } catch (e) {
                error(`Transfer owner failed: ${e.message}`);
            }
        });

    group
        .command("block-member <groupId> <userIds...>")
        .description("Block members from rejoining the group")
        .action(async (groupId, userIds) => {
            try {
                const result = await getApi().addGroupBlockedMember(userIds, groupId);
                output(result, program.opts().json, () => success("Member(s) blocked"));
            } catch (e) {
                error(`Block member failed: ${e.message}`);
            }
        });

    group
        .command("unblock-member <groupId> <userIds...>")
        .description("Unblock previously blocked members")
        .action(async (groupId, userIds) => {
            try {
                const result = await getApi().removeGroupBlockedMember(userIds, groupId);
                output(result, program.opts().json, () => success("Member(s) unblocked"));
            } catch (e) {
                error(`Unblock member failed: ${e.message}`);
            }
        });

    group
        .command("upgrade-community <groupId>")
        .description("Upgrade a group to Zalo Community (requires verified 18+ account)")
        .action(async (groupId) => {
            try {
                const result = await getApi().upgradeGroupToCommunity(groupId);
                output(result, program.opts().json, () => success("Group upgraded to community"));
            } catch (e) {
                error(`Upgrade failed: ${e.message}`);
            }
        });

    group
        .command("leave <groupId>")
        .description("Leave a group")
        .action(async (groupId) => {
            try {
                const result = await getApi().leaveGroup(groupId);
                output(result, program.opts().json, () => success("Left group"));
            } catch (e) {
                error(e.message);
            }
        });

    group
        .command("join <link>")
        .description("Join a group via invite link")
        .action(async (link) => {
            try {
                const result = await getApi().joinGroup(link);
                output(result, program.opts().json, () => success("Joined group"));
            } catch (e) {
                error(e.message);
            }
        });

    group
        .command("members-info <userIds...>")
        .description("Get detailed info for group members by user IDs")
        .action(async (userIds) => {
            try {
                const result = await getApi().getGroupMembersInfo(userIds);
                output(result, program.opts().json, () => {
                    const profiles = result?.profiles || {};
                    const entries = Object.entries(profiles);
                    info(`${entries.length} member(s) info`);
                    for (const [uid, p] of entries) {
                        console.log(`  ${uid}  ${p.displayName || p.zaloName || "?"}`);
                    }
                });
            } catch (e) {
                error(`Get members info failed: ${e.message}`);
            }
        });

    group
        .command("settings <groupId>")
        .description("Update group settings (flags: --block-name, --sign-admin, --join-appr, etc.)")
        .option("--block-name", "Disallow members to change group name/avatar")
        .option("--no-block-name", "Allow members to change group name/avatar")
        .option("--sign-admin", "Highlight admin messages")
        .option("--no-sign-admin", "Don't highlight admin messages")
        .option("--msg-history", "Allow new members to read recent messages")
        .option("--no-msg-history", "Hide message history from new members")
        .option("--join-appr", "Require membership approval")
        .option("--no-join-appr", "No membership approval required")
        .option("--lock-post", "Disallow members to create notes/reminders")
        .option("--no-lock-post", "Allow members to create notes/reminders")
        .option("--lock-poll", "Disallow members to create polls")
        .option("--no-lock-poll", "Allow members to create polls")
        .option("--lock-msg", "Disallow members to send messages")
        .option("--no-lock-msg", "Allow members to send messages")
        .option("--lock-view-member", "Hide full member list (community only)")
        .option("--no-lock-view-member", "Show full member list")
        .action(async (groupId, opts) => {
            try {
                const settings = {
                    blockName: opts.blockName ?? false,
                    signAdminMsg: opts.signAdmin ?? false,
                    enableMsgHistory: opts.msgHistory ?? false,
                    joinAppr: opts.joinAppr ?? false,
                    lockCreatePost: opts.lockPost ?? false,
                    lockCreatePoll: opts.lockPoll ?? false,
                    lockSendMsg: opts.lockMsg ?? false,
                    lockViewMember: opts.lockViewMember ?? false,
                };
                const result = await getApi().updateGroupSettings(settings, groupId);
                output(result, program.opts().json, () => success(`Group settings updated for ${groupId}`));
            } catch (e) {
                error(`Update settings failed: ${e.message}`);
            }
        });

    group
        .command("pending <groupId>")
        .description("List pending group member requests (admin only)")
        .action(async (groupId) => {
            try {
                const result = await getApi().getPendingGroupMembers(groupId);
                output(result, program.opts().json, () => {
                    const users = result?.users || [];
                    info(`${users.length} pending member(s)`);
                    for (const u of users) {
                        console.log(`  ${u.uid}  ${u.dpn || "?"}`);
                    }
                });
            } catch (e) {
                error(`Get pending members failed: ${e.message}`);
            }
        });

    group
        .command("approve <groupId> <userIds...>")
        .description("Approve pending member requests (admin only)")
        .action(async (groupId, userIds) => {
            try {
                const result = await getApi().reviewPendingMemberRequest(
                    { members: userIds, isApprove: true },
                    groupId,
                );
                output(result, program.opts().json, () => success(`Approved ${userIds.length} member(s)`));
            } catch (e) {
                error(`Approve members failed: ${e.message}`);
            }
        });

    group
        .command("reject-member <groupId> <userIds...>")
        .description("Reject pending member requests (admin only)")
        .action(async (groupId, userIds) => {
            try {
                const result = await getApi().reviewPendingMemberRequest(
                    { members: userIds, isApprove: false },
                    groupId,
                );
                output(result, program.opts().json, () => success(`Rejected ${userIds.length} member(s)`));
            } catch (e) {
                error(`Reject members failed: ${e.message}`);
            }
        });

    group
        .command("enable-link <groupId>")
        .description("Enable and create a new group invite link")
        .action(async (groupId) => {
            try {
                const result = await getApi().enableGroupLink(groupId);
                output(result, program.opts().json, () => {
                    success("Group link enabled");
                    if (result?.link) info(`Link: ${result.link}`);
                });
            } catch (e) {
                error(`Enable link failed: ${e.message}`);
            }
        });

    group
        .command("disable-link <groupId>")
        .description("Disable group invite link")
        .action(async (groupId) => {
            try {
                const result = await getApi().disableGroupLink(groupId);
                output(result, program.opts().json, () => success("Group link disabled"));
            } catch (e) {
                error(`Disable link failed: ${e.message}`);
            }
        });

    group
        .command("link-info <groupId>")
        .description("Get group invite link details")
        .action(async (groupId) => {
            try {
                const result = await getApi().getGroupLinkDetail(groupId);
                output(result, program.opts().json, () => {
                    info(`Enabled: ${result?.enabled === 1 ? "yes" : "no"}`);
                    if (result?.link) info(`Link: ${result.link}`);
                    if (result?.expiration_date) info(`Expires: ${new Date(result.expiration_date).toISOString()}`);
                });
            } catch (e) {
                error(`Get link info failed: ${e.message}`);
            }
        });

    group
        .command("blocked <groupId>")
        .description("List blocked members in a group")
        .option("-c, --count <n>", "Items per page", parseInt, 50)
        .option("-p, --page <n>", "Page number", parseInt, 1)
        .action(async (groupId, opts) => {
            try {
                const result = await getApi().getGroupBlockedMember({ page: opts.page, count: opts.count }, groupId);
                output(result, program.opts().json, () => {
                    const members = result?.blocked_members || [];
                    info(`${members.length} blocked member(s)`);
                    for (const m of members) {
                        console.log(`  ${m.id}  ${m.dName || m.zaloName || "?"}`);
                    }
                    if (result?.has_more) info("(more pages available)");
                });
            } catch (e) {
                error(`Get blocked members failed: ${e.message}`);
            }
        });

    group
        .command("note-create <groupId> <title>")
        .description("Create a note in a group")
        .option("--pin", "Pin the note")
        .action(async (groupId, title, opts) => {
            try {
                const result = await getApi().createNote({ title, pinAct: opts.pin || false }, groupId);
                output(result, program.opts().json, () => success(`Note created in group ${groupId}`));
            } catch (e) {
                error(`Create note failed: ${e.message}`);
            }
        });

    group
        .command("note-edit <groupId> <noteId> <title>")
        .description("Edit an existing note in a group")
        .option("--pin", "Pin the note")
        .action(async (groupId, noteId, title, opts) => {
            try {
                const result = await getApi().editNote({ title, topicId: noteId, pinAct: opts.pin || false }, groupId);
                output(result, program.opts().json, () => success(`Note ${noteId} updated`));
            } catch (e) {
                error(`Edit note failed: ${e.message}`);
            }
        });

    group
        .command("invite-boxes")
        .description("List pending group invitations received")
        .action(async () => {
            try {
                const result = await getApi().getGroupInviteBoxList();
                output(result, program.opts().json, () => {
                    const invites = result?.invitations || [];
                    info(`${invites.length} invitation(s) (total: ${result?.total || 0})`);
                    for (const inv of invites) {
                        const g = inv.groupInfo || {};
                        const inviter = inv.inviterInfo || {};
                        console.log(`  ${g.groupId || "?"}  "${g.name || "?"}" from ${inviter.dName || "?"}`);
                    }
                });
            } catch (e) {
                error(`Get invite boxes failed: ${e.message}`);
            }
        });

    group
        .command("join-invite <groupId>")
        .description("Accept a group invitation from invite box")
        .action(async (groupId) => {
            try {
                const result = await getApi().joinGroupInviteBox(groupId);
                output(result, program.opts().json, () => success(`Joined group ${groupId} via invitation`));
            } catch (e) {
                error(`Join invite failed: ${e.message}`);
            }
        });

    group
        .command("delete-invite <groupIds...>")
        .description("Delete group invitations from invite box")
        .option("--block", "Block future invites from these groups")
        .action(async (groupIds, opts) => {
            try {
                const result = await getApi().deleteGroupInviteBox(groupIds, opts.block || false);
                output(result, program.opts().json, () =>
                    success(`Deleted ${groupIds.length} invitation(s)${opts.block ? " (blocked future)" : ""}`),
                );
            } catch (e) {
                error(`Delete invite failed: ${e.message}`);
            }
        });

    group
        .command("invite-to <userId> <groupIds...>")
        .description("Invite a user to one or more groups")
        .action(async (userId, groupIds) => {
            try {
                const result = await getApi().inviteUserToGroups(userId, groupIds);
                output(result, program.opts().json, () => success(`Invited ${userId} to ${groupIds.length} group(s)`));
            } catch (e) {
                error(`Invite to groups failed: ${e.message}`);
            }
        });

    group
        .command("disperse <groupId>")
        .description("Disperse (disband) a group permanently — WARNING: irreversible!")
        .action(async (groupId) => {
            try {
                const result = await getApi().disperseGroup(groupId);
                output(result, program.opts().json, () => success(`Group ${groupId} dispersed`));
            } catch (e) {
                error(`Disperse group failed: ${e.message}`);
            }
        });
}

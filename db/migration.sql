create table
    messages (
        message_id numeric not null primary key,
        guild_id numeric not null,
        user_id numeric not null,
        channel_id numeric not null,
        content varchar(5000) not null,
        time timestamp not null
    );

create index messages_user_id_index on messages (user_id);

create index messages_guild_id_index on messages (guild_id);

create index messages_content_index on messages (content);

create index messages_time_index on messages (time);

alter table messages
add
    constraint messages_unique_key unique (message_id);
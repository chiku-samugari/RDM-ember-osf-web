/* tslint:disable:object-literal-sort-keys max-line-length */

export default {
    general: {
        share: '分享',
        embed: '嵌入',
        download: '下载',
        delete: '删除',
        view: '查看',
        edit: '编辑',
        cancel: '取消',
        revisions: '版本',
        md5: 'MD5',
        date: '日期',
        sha2: 'SHA2',
        title: '标题',
        contributors: '合作者',
        modified: '修改时间',
        description: '描述',
        create: '创建',
        and: 'and',
        more: '更多',
        clipboard_copy: 'Copy to clipboard',
        sort_asc: 'Sort ascending',
        sort_desc: 'Sort descending',
        next: 'next',
        previous: 'previous',
        help: 'help',
        api: 'API',
        cos: 'Center for Open Science',
        home: 'Home',
    },
    quickfiles: {
        title: '{{user-name}} 的 Quick Files',
        description: '在这里上传的文件都将被公开，并且可以使用共享链接轻松与他人分享。',
        feedback_dialog_text: '告诉我们您对 Quick Files 的看法',
        transition_auth: '您必须登陆才能查看您的 Quick Files。重新定向到登陆页面。',
    },
    feedback: {
        button_text: '反馈',
        placeholder: '分享您的反馈',
        follow_up_label: '关于进一步改善 OSF 的机会，请与我联系',
        title: '提交反馈',
        confirm_button_text: '提交',
        thank_you: '非常感谢!',
        success: '您的反馈已成功提交',
        dismiss: '知道了',
    },
    file_detail: {
        version: {
            id: '版本 ID',
            title: '（版本：{{version-number}}）',
        },
        embed: {
            dynamic: '使用 JavaScript 动态呈现 iframe',
            direct: '直接使用固定高度和宽度的 iframe',
        },
        tags: '标签：',
        toggle: '切换视图：',
        delete_file: {
            question: '删除文件？',
            confirm: '您是否确定要删除该文件：<b>{{file-name}}</b>',
        },
        sha2_description: 'SHA-2 是一种由 NSA 设计的加密散列函数，用于验证数据完整性。',
        md5_description: 'MD5 是一种用于验证数据完整性的算法.',
        // toast messages
        delete_success: '文件已删除',
        delete_fail: '错误，文件删除失败',
        save_success: '文件已保存',
        save_fail: '错误，无法保存文件',
        mfr_iframe_title: 'Rendering of document',
        add_tag: 'add a tag to enhance discoverability',
    },
    file_browser: {
        loading: 'Loading...',
        delete_multiple: 'Delete multiple',
        download_zip: 'Download as zip',
        drop_placeholder: 'Drop files here to upload',
        drop_reminder: 'Drop file to upload',
        no_files: 'This user has not uploaded any quickfiles',
        share_title: 'Share',
        clipboard_copy: 'Copy to clipboard',
        info: {
            title: 'How to use the file browser',
            upload: '<b>Upload:</b> Single file uploads via drag and drop or by clicking the upload button.',
            select: '<b>Select rows:</b> Click on a row to show further actions in the toolbar. Use Command or Shift keys to select multiple files.',
            folders: '<b>Folders:</b> Not supported; consider an OSF project for uploading and managing many files.',
            open1: '<b>Open files:</b> Click a file name to go to view the file in the OSF.',
            open2: '<b>Open files in new tab:</b> Press Command (Ctrl in Windows) and click a file name to open it in a new tab.',
            download: '<b>Download as zip:</b> Click the Download as Zip button in the toolbar to download all files as a .zip.',
        },
        delete_modal: {
            title: 'Delete "{{selectedItems.firstObject.itemName}}"?',
            title_multiple: 'Delete multiple?',
            body: 'This action is irreversible',
        },
        conflict_modal: {
            title: 'An item named {{textValue}} already exists in this location.',
            keep_info: '"Keep both" will retain both files (and their version histories) in this location.',
            replace_info: '"Replace" will overwrite the existing file in this location. You will lose previous versions of the overwritten file. You will keep previous versions of the moved file.',
            keep_button: 'Keep both',
            replace_button: 'Replace',
        },
        move_modal: {
            title: 'Move file to project',
            move_button: 'Move file',
        },

    },
    dashboard: {
        page_title: 'Home',
        title: '仪表盘',
        create_new_project_button: '创建新项目',
        quicksearch: {
            search: '搜索您的项目',
            other_links: '前往<a href="/myprojects/">我的项目</a>来组织或<a href="/search/">搜索</a> OSF',
            no_results: '找不到匹配选项！',
            no_projects: {
                line1: '您还没有项目。请使用右上角的按钮创建一个项目。',
                line2: '该功能可以让您搜索并快速访问您的项目。',
                preview_alt: '全部快速项目预览页面',
            },
            private_parent: '私人项目 / ',
            private_grandparent: '私人项目 / 私人 / ',
        },
        noteworthy: {
            description: '发现公共项目',
            new_and_noteworthy: '新的和值得注意的项目',
            failed_noteworthy: '载入“新的和值得注意的项目”失败',
            most_popular: '最受欢迎的项目',
            failed_popular: '载入“最受欢迎的项目”失败',
            search_more: '搜索更多项目',
            by: 'by',
        },
        meetings: {
            title: '需要举办会议？',
            description: '使用 OSF for Meetings 为您的会议提供统一文件提交服务',
            button: '查看会议',
        },
        preprints: {
            title: '游览最近的研究',
            description: '查看 OSF 上各类研究领域的最新的 Preprints',
            button: '查看 Preprints',
        },
    },
    new_project: {
        header: '创建新项目',
        title_placeholder: '输入项目标题',
        more: '更多',
        affiliation: '附属',
        remove_all: '移除所有',
        select_all: '全选',
        no_matches: '找不到匹配选项',
        description_placeholder: '输入项目描述',
        template_title: '模版 (可选项)',
        template_search_help: '开始输入来搜索您的项目。如果选择项目作为模版，新的项目将复制模版结构结构而不导入具体项目内容。',
        template_placeholder: '选择也各项目作为模版来使用',
        success_message: '新项目创建成功！',
        stay_here: '待在这里',
        go_to_new: '前往新项目',
    },
    banners: {
        prereg: {
            description: '改善您的下一项研究。加入 Prereg Challenge 来赢取1000美元。',
            button: '开始 Prereg Challenge',
        },
    },
    support: {
        title: 'Support',
        faq_title: 'Frequently Asked Questions',
        faq_paragraph: 'How can it be free? How will the OSF be useful to my research? What is a registration? Get your questions about the Open Science Framework answered on our ',
        faq_link_text: 'FAQ page.',
        faq_button: 'Visit FAQ',
        guides_title: 'OSF Guides',
        guides_paragraph_1: 'Learn how to use the OSF for improving your research workflow. Read our ',
        guides_link_text: 'Guides',
        guides_paragraph_2: 'for step-by-step screenshots that show you the basics of project structures, version control, privacy, files, add-on support, and more!',
        guides_button: 'Visit Guides',
        contact_title: 'Get in Touch',
        contact_technical: 'For emails about technical support:',
        contact_questions: 'For all other questions or comments',
        prereg_title: 'Do you have Prereg Challenge related questions?',
        prereg_paragraph_1: 'Check out our ',
        prereg_link_text: 'Prereg section',
        prereg_paragraph_2: ' on the cos.io website.',
        status_title: 'Are you experiencing downtime with our services?',
        status_paragraph_1: 'Check out our',
        status_link_text: 'status page',
        status_paragraph_2: 'for updates on how our services are operating.',
        consultation_title: 'Are you looking for statistics consultations?',
        consultation_paragraph: 'COS provides statistics consultation. To learn more about this service visit the',
        consultation_link_text: 'COS statistics consulting page.',
        social_title: 'Other ways to get help',
        social_twitter: 'Ask us a question on twitter',
        social_mailing: 'Join our mailing list',
        social_facebook: 'Follow us on Facebook',
        social_github: 'Connect with COS on GitHub',
    },
    footer: {
        status: 'Status',
        faq: 'FAQ/Guides',
        source_code: 'Source Code',
        rpp: 'Reproducibility Project: Psychology',
        rpcb: 'Reproducibility Project: Cancer Biology',
        top: 'TOP Guidelines',
        donate: 'Donate',
        socialize: 'Socialize',
        contact: 'Contact',
    },
};

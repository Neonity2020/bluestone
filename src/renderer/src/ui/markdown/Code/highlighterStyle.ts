import { createStyles } from 'antd-style'

export const useStyles = createStyles(
  ({ token, css, cx, prefixCls, stylish }, type: 'ghost' | 'block' | 'pure') => {
    const prefix = `${prefixCls}-highlighter`
    const buttonHoverCls = `${prefix}-hover-btn`
    const langHoverCls = `${prefix}-hover-lang`

    return {
      button: cx(
        buttonHoverCls,
        css`
          position: absolute;
          z-index: 2;
          inset-block-start: ${type === 'pure' ? 0 : '8px'};
          inset-inline-end: ${type === 'pure' ? 0 : '8px'};

          opacity: 0;
        `
      ),

      container: cx(
        prefix,
        css`
          position: relative;
          overflow: hidden;
          border-radius: ${token.borderRadius}px;
          transition: background-color 100ms ${token.motionEaseOut};

          &:hover {
            .${buttonHoverCls} {
              opacity: 1;
            }

            .${langHoverCls} {
              opacity: 1;
            }
          }

          .prism-code {
            background: none !important;
          }

          pre {
            overflow: auto hidden;

            margin: 0 !important;
            padding: ${type === 'pure' ? 0 : `16px`} !important;

            white-space: break-spaces;
          }

          code {
            background: transparent !important;
          }
        `
      ),
      header: css`
        position: relative;
        padding-block: 4px;
        padding-inline: 8px;
      `,
      lang: cx(
        langHoverCls,
        // stylish.blur,
        css`
          position: absolute;
          z-index: 2;
          inset-block-end: 8px;
          inset-inline-end: 0;

          font-family: ${token.fontFamilyCode};
          color: ${token.colorTextSecondary};

          opacity: 0;

          transition: opacity 0.1s;
        `
      ),
      nowrap: css`
        code {
          text-wrap: nowrap !important;
        }
      `,
      scroller: css`
        overflow: auto;
        width: 100%;
        height: 100%;
      `,
      select: css`
        user-select: none;

        position: absolute;
        inset-inline-start: 50%;
        transform: translateX(-50%);

        min-width: 100px;

        font-size: 14px;
        color: ${token.colorTextDescription};
        text-align: center;
        .${prefixCls}-select-selection-item {
          min-width: 100px;
          padding-inline-end: 0 !important;
          color: ${token.colorTextDescription};
          text-align: center;
        }
      `
    }
  }
)

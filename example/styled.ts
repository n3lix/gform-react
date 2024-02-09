import { FormControl } from '@mui/material';
import styled from '@emotion/styled';

export const SCSS_Container = styled('div')`
    width: 90%;
    margin: 0 auto;
    display: flex;
    flex-wrap: wrap;
`;

export const SCSS_FormGroup = styled('div')`
    margin-bottom: 1rem;

    & > div {
        width: 100%;
    }

    label, input, small {
        display: block;
    }

    small {
        font-size: 1rem;
    }
      
    label {
        font-size: 1.3rem;
    }
      
    input {
        width: 100%;
    }
`;

export const SCSS_Box = styled('div')`
    border: .15rem solid black;
    padding: 2.5rem 3.5rem;
    border-radius: 1.5rem;
    min-width: 25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-right: .5rem;

    form {
        width: 100%;
    }

    h3 {
        text-align: center;
    }
`;

export const SCSS_FormConrol = styled(FormControl)`
margin-bottom: 1rem;
width: 100%;

`;
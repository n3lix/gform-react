import React from "react";
import {GInput} from "../../src/fields/GInput";

const TestForm = () =>{
    return (
        <div>
            <GInput required formKey={'test'} value={'blob'} minLength={10}
                            element={(input, props) => <div>
                                <input {...props} />
                                {input.error && <small>{input.errorText}</small>}
                            </div>}
            />
        </div>
    );
};

export default TestForm;